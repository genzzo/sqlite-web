import { KeyValueStore } from "./kv-stores";

type OnConsumerChange = (isConsumer: boolean) => void | Promise<void>;

type CreateSharedServiceOptions<T extends object> = {
  serviceName: string;
  service: T;
  onConsumerChange?: OnConsumerChange;
};

type CreateSharedServiceProviderOptions<T> = {
  serviceName: string;
  service: T;
  onReady: () => void | Promise<void>;
};

type CreateSharedServiceClientOptions<T extends object> = {
  serviceName: string;
};

type InFlightRequest<T extends object, K extends keyof T = keyof T> = {
  method: K;
  args: unknown[];
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

type SharedServiceProxy<T extends object> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : T[K];
};

type ClientRegistrationEventData = {
  type: "client-registration";
  payload: {
    clientId: string;
  };
};

type ClientRegisteredEventData = {
  type: "client-registered";
  payload: {
    clientId: string;
  };
};

type ProviderElectedEventData = {
  type: "provider-elected";
};

type SharedChannelEventData =
  | ClientRegistrationEventData
  | ClientRegisteredEventData
  | ProviderElectedEventData;

type ClientPrivateRequestEventData<
  T extends object,
  K extends keyof T = keyof T
> = {
  type: "request";
  payload: {
    nonce: string;
    methodKey: K;
    method: T[keyof T] & Function;
    args: unknown[];
  };
};

type ClientPrivateResponseEventData<
  T extends object,
  K extends keyof T = keyof T
> = {
  type: "response";
  payload: {
    nonce: string;
    result: T[K];
    error: unknown;
  };
};

type ClientPrivateEventData<T extends object, K extends keyof T = keyof T> =
  | ClientPrivateRequestEventData<T, K>
  | ClientPrivateResponseEventData<T, K>;

/**
 * Creates an exclusive {@link https://developer.mozilla.org/en-US/docs/Web/API/Lock Web Lock} with an unresolved promise.
 * This lock will never be released until the context is destroyed. This is useful for tracking the lifetime of the context and implementing a context queue.
 */
function createInfinitelyOpenLock(
  name: string,
  callback?: (lock: Lock | null) => void | Promise<void>
) {
  navigator.locks.request(name, { mode: "exclusive" }, async (lock) => {
    if (callback !== undefined) {
      await callback(lock);
    }
    await new Promise(() => {});
  });
}

function validateProxyProperty<T extends object>(
  target: T,
  property: PropertyKey
): asserts property is keyof T {
  if (typeof property === "symbol") return;

  if (!(property in target)) {
    throw new Error(`Property ${String(property)} does not exist`);
  }
}

function createLogger(
  serviceName: string,
  logLevel: "none" | "debug" | "info" | "warn" | "error"
) {
  const logLevelMap = {
    none: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
  };

  return {
    debug: (...args: unknown[]) => {
      if (logLevelMap[logLevel] >= logLevelMap.debug) {
        console.debug(`[${serviceName}]`, ...args);
      }
    },
    info: (...args: unknown[]) => {
      if (logLevelMap[logLevel] >= logLevelMap.info) {
        console.info(`[${serviceName}]`, ...args);
      }
    },
    warn: (...args: unknown[]) => {
      if (logLevelMap[logLevel] >= logLevelMap.warn) {
        console.warn(`[${serviceName}]`, ...args);
      }
    },
    error: (...args: unknown[]) => {
      if (logLevelMap[logLevel] >= logLevelMap.error) {
        console.error(`[${serviceName}]`, ...args);
      }
    },
  };
}
const tempGlobalLogger = createLogger("temp-global", "info");

class ManualPromise<T, E = unknown> {
  private _internalPromise: Promise<T>;
  private _internalResolve: (value: T) => void;
  private _internalReject: (reason?: E) => void;

  constructor() {
    this._internalResolve = this._noop;
    this._internalReject = this._noop;

    this._internalPromise = new Promise<T>((promiseResolve, promiseReject) => {
      this._internalResolve = (value) => {
        promiseResolve(value);
        this._resetCallbacks();
      };
      this._internalReject = (reason) => {
        promiseReject(reason);
        this._resetCallbacks();
      };
    });
  }

  get promise() {
    return this._internalPromise;
  }

  resolve(value: T) {
    this._internalResolve(value);
  }

  reject(reason?: E) {
    this._internalReject(reason);
  }

  reset() {
    this._resetCallbacks();
    this._internalPromise = new Promise<T>((promiseResolve, promiseReject) => {
      this._internalResolve = (value) => {
        promiseResolve(value);
        this._resetCallbacks();
      };
      this._internalReject = (reason) => {
        promiseReject(reason);
        this._resetCallbacks();
      };
    });
  }

  private _resetCallbacks() {
    this._internalResolve = this._noop;
    this._internalReject = this._noop;
  }

  private _noop = (..._args: unknown[]) => {};
}

class SharedServiceUtils {
  constructor() {
    throw new Error("This class cannot be instantiated");
  }

  static generateId() {
    return crypto.randomUUID();
  }

  static getLockName(serviceName: string) {
    return `shared-service:${serviceName}`;
  }

  static getSharedChannelName(serviceName: string) {
    return `shared-service:${serviceName}`;
  }

  static getClientChannelName(serviceName: string, clientId: string) {
    return `shared-service:${serviceName}:${clientId}`;
  }

  static getClientLockName(serviceName: string, clientId: string) {
    return `shared-service:${serviceName}:${clientId}`;
  }
}

class SharedService<T extends object> {
  private readonly serviceName: string;
  private readonly service: T;
  private readonly readyState: ManualPromise<void>;
  readonly serviceProxy: SharedServiceProxy<T>;
  private serviceNode?: SharedServiceProvider<T> | SharedServiceClient<T>;

  constructor(options: CreateSharedServiceOptions<T>) {
    this.serviceName = options.serviceName;
    this.service = options.service;
    this.serviceProxy = this._createProxy();
    this.readyState = new ManualPromise<void>();

    this._registerNode();
  }

  get ready() {
    return this.readyState.promise;
  }

  get isProvider() {
    return this.serviceNode instanceof SharedServiceProvider;
  }

  private async _registerNode() {
    const lockName = SharedServiceUtils.getLockName(this.serviceName);

    const locks = await navigator.locks.query();
    const sharedServiceLockExists = locks.held?.some(
      (lock) => lock.name === lockName
    );

    if (sharedServiceLockExists) {
      this.serviceNode = new SharedServiceClient<T>({
        serviceName: this.serviceName,
      });
    }

    createInfinitelyOpenLock(lockName, () => {
      this.serviceNode = new SharedServiceProvider<T>({
        serviceName: this.serviceName,
        service: this.service,
        onReady: () => {
          this.readyState.resolve();
        },
      });
    });
  }

  private _createProxy() {
    return new Proxy(this.service, {
      get: (target, property) => {
        return async (...args: unknown[]) => {
          await this.readyState.promise;

          if (this.serviceNode === undefined) {
            throw new Error("Service node is not defined");
          }

          validateProxyProperty(target, property);

          const propertyValue = target[property];

          if (typeof propertyValue !== "function") {
            return propertyValue;
          }

          return this.serviceNode.callServiceMethod(property, args);
        };
      },
    }) as SharedServiceProxy<T>;
  }
}

class SharedServiceProvider<T extends object> {
  private readonly serviceName: string;
  private readonly service: T;
  private readonly sharedChannel: BroadcastChannel;
  private readonly registeredClients: Set<string>;
  private readonly requestsInProcess: Set<string>;
  private readonly providerInFlightRequestsStore?: KeyValueStore<unknown>;
  private readonly onReady: () => void | Promise<void>;

  constructor(options: CreateSharedServiceProviderOptions<T>) {
    this.serviceName = options.serviceName;
    this.service = options.service;
    this.onReady = options.onReady;
    this.sharedChannel = new BroadcastChannel(
      SharedServiceUtils.getSharedChannelName(this.serviceName)
    );
    this.registeredClients = new Set();
    this.requestsInProcess = new Set();
    this._init();
  }

  private async _init() {
    this._handleClientRegistration();
    await Promise.all([
      this._handleElection(),
      this._handlePreviousProviderUnfinishedRequests(),
    ]);
    this.onReady();
  }

  private _handleClientRegistration() {
    this.sharedChannel.addEventListener(
      "message",
      (e: MessageEvent<SharedChannelEventData>) => {
        const { type } = e.data;
        if (type !== "client-registration") return;

        const { clientId } = e.data.payload;

        if (this.registeredClients.has(clientId)) {
          tempGlobalLogger.error(
            `Client with id ${clientId} already registered`
          );
          return;
        }

        tempGlobalLogger.info(
          `Client with id ${clientId} is registering, creating channel...`
        );

        const clientPrivateChannelName =
          SharedServiceUtils.getClientChannelName(this.serviceName, clientId);
        const clientLockName = SharedServiceUtils.getClientLockName(
          this.serviceName,
          clientId
        );

        const clientPrivateChannel = new BroadcastChannel(
          clientPrivateChannelName
        );

        navigator.locks.request(clientLockName, { mode: "exclusive" }, () => {
          tempGlobalLogger.info(
            `Client with id ${clientId} has disconnected, cleaning up`
          );
          this.registeredClients.delete(clientId);
          clientPrivateChannel.close();
        });

        clientPrivateChannel.addEventListener(
          "message",
          async (e: MessageEvent<ClientPrivateEventData<T>>) => {
            if (e.data.type === "response") return;
            const { nonce, methodKey, method, args } = e.data.payload;

            if (this.requestsInProcess.has(nonce)) {
              tempGlobalLogger.warn(
                `Request with nonce ${nonce} already in process`
              );
              return;
            }
            this.requestsInProcess.add(nonce);

            tempGlobalLogger.info(
              `Received request from client ${clientId} with nonce ${nonce} to call method ${String(
                methodKey
              )} with args ${JSON.stringify(args)}`
            );

            let result: unknown;
            let error: unknown;
            try {
              result = await (this.service[methodKey] as T[keyof T] & Function)(
                ...args
              );
            } catch (e) {
              error = e;
            } finally {
              this.requestsInProcess.delete(nonce);
            }

            tempGlobalLogger.info(
              `Sending response to client ${clientId} with nonce ${nonce} with result ${JSON.stringify(
                result
              )} and error ${JSON.stringify(error)}`
            );
            clientPrivateChannel.postMessage({
              type: "response",
              payload: {
                nonce,
                result,
                error,
              },
            });
          }
        );

        this.registeredClients.add(clientId);
        tempGlobalLogger.info(`Client with id ${clientId} registered`);

        this.sharedChannel.postMessage({
          type: "client-registered",
          payload: {
            clientId,
          },
        });
      }
    );
  }

  private async _handleElection() {
    this.sharedChannel.postMessage({
      type: "provider-elected",
    });
  }

  private async _handlePreviousProviderUnfinishedRequests() {
    if (this.providerInFlightRequestsStore === undefined) return;
    const inFlightRequests = await this.providerInFlightRequestsStore.getAll();
    // complete here
  }

  async callServiceMethod(method: keyof T, args: unknown[]) {
    return (this.service[method] as T[keyof T] & Function)(...args);
  }
}

class SharedServiceClient<T extends object> {
  private readonly id: string;
  private readonly sharedChannel: BroadcastChannel;
  private readonly requestsInFlight: Map<string, InFlightRequest<T>>;
  private readonly clientChannel: BroadcastChannel;

  constructor(options: CreateSharedServiceClientOptions<T>) {
    this.id = SharedServiceUtils.generateId();
    const sharedChannelName = SharedServiceUtils.getSharedChannelName(
      options.serviceName
    );
    this.sharedChannel = new BroadcastChannel(sharedChannelName);
    this.requestsInFlight = new Map();
    this.clientChannel = new BroadcastChannel(
      SharedServiceUtils.getClientChannelName(options.serviceName, this.id)
    );
    this._init();
  }

  private async _init() {
    createInfinitelyOpenLock(
      SharedServiceUtils.getClientLockName(this.sharedChannel.name, this.id)
    );
    await this._registerWithProvider();
    this._handleProviderElection();
  }

  private _handleProviderElection() {
    this.sharedChannel.addEventListener(
      "message",
      async (e: MessageEvent<SharedChannelEventData>) => {
        const { type } = e.data;
        if (type !== "provider-elected") return;

        await this._registerWithProvider();

        if (this.requestsInFlight.size > 0) {
          for (const [nonce, { method, args, resolve, reject }] of this
            .requestsInFlight) {
            const responseListener = this._createResponseListener(
              nonce,
              resolve,
              reject
            );
            this.clientChannel.addEventListener("message", responseListener);
            this.clientChannel.postMessage({
              type: "request",
              payload: {
                nonce,
                method,
                args,
              },
            });
          }
        }
      }
    );
  }

  private async _registerWithProvider() {
    await new Promise<void>((resolve) => {
      const onRegisteredListener = (
        event: MessageEvent<SharedChannelEventData>
      ) => {
        if (
          event.data.type === "client-registered" &&
          event.data.payload.clientId === this.id
        ) {
          this.sharedChannel.removeEventListener(
            "message",
            onRegisteredListener
          );
          resolve();
        }
      };
      this.sharedChannel.addEventListener("message", onRegisteredListener);
      this.sharedChannel.postMessage({
        type: "client-registration",
        payload: { clientId: this.id },
      });
    });
    // await this.onConsumerChange?.(this.isConsumer);
  }

  private _createResponseListener(
    nonce: string,
    resolve: (value: unknown) => void,
    reject: (reason?: unknown) => void
  ) {
    const listener = (event: MessageEvent<ClientPrivateEventData<T>>) => {
      const { type, payload } = event.data;
      if (type === "request" || payload.nonce !== nonce) return;

      const { result, error } = payload;

      if (error) {
        reject(error);
      } else {
        resolve(result);
      }

      this.requestsInFlight.delete(nonce);
      this.clientChannel.removeEventListener("message", listener);
    };

    return listener;
  }

  callServiceMethod(method: keyof T, args: unknown[]) {
    return new Promise((resolve, reject) => {
      const nonce = SharedServiceUtils.generateId();
      const responseListener = this._createResponseListener(
        nonce,
        resolve,
        reject
      );
      this.clientChannel.addEventListener("message", responseListener);
      this.clientChannel.postMessage({
        type: "request",
        payload: {
          nonce,
          method,
          args,
        },
      });
      this.requestsInFlight.set(nonce, {
        method,
        args,
        resolve,
        reject,
      });
    });
  }
}

export function createSharedService<T extends object>(
  options: CreateSharedServiceOptions<T>
) {
  return new SharedService(options);
}
