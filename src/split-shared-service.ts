import { KeyValueStore } from "./kv-stores";

type OnProviderElection = (isProvider: boolean) => void | Promise<void>;

type SharedServiceNode<T extends object> = {
  callServiceMethod: (method: keyof T, args: unknown[]) => Promise<unknown>;
};

type CreateSharedServiceOptions<T extends object> = {
  serviceName: string;
  service: T;
  onProviderElection?: OnProviderElection;
};

type CreateSharedServiceProviderOptions<T> = {
  serviceName: string;
  service: T;
  readyState: ManualPromise<void>;
  onProviderElection: OnProviderElection;
};

type CreateSharedServiceClientOptions = {
  serviceName: string;
  readyState: ManualPromise<void>;
  onProviderElection: OnProviderElection;
};

type InFlightRequest<T extends object, K extends keyof T = keyof T> = {
  method: K;
  args: unknown[];
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

type ProviderInFlightRequestsKeyValueStore<T extends object> = KeyValueStore<
  Omit<InFlightRequest<T>, "resolve" | "reject"> & {
    nonce: string;
  }
>;

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
    method: K;
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
    console.log("Lock released");
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

async function retry<T>(
  fn: () => T | Promise<T>,
  options: {
    retries: number;
    delay: number | ((attempt: number) => number);
  } = {
    retries: 3,
    delay: (attempt: number) => Math.pow(2, attempt) * 250,
  }
) {
  const { retries, delay } = options;
  if (retries < 0) {
    throw new Error("Retries must be greater than or equal to 0");
  }
  if (typeof delay !== "number" && typeof delay !== "function") {
    throw new Error("Delay must be a number or a function");
  }

  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > retries) {
        throw new Error(
          `Function failed after ${retries + 1} attempts. Error: ${error}`
        );
      }
      const currentDelay = typeof delay === "function" ? delay(attempt) : delay;
      await new Promise((res) => setTimeout(res, currentDelay));
    }
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
const tempGlobalLogger = createLogger("temp-global", "debug");

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
  private serviceNode?: SharedServiceNode<T>;
  private readonly onProviderElection: OnProviderElection;

  constructor(options: CreateSharedServiceOptions<T>) {
    tempGlobalLogger.debug(
      `Creating shared service with name ${options.serviceName}`
    );

    this.serviceName = options.serviceName;
    this.service = options.service;
    this.serviceProxy = this._createProxy();
    this.readyState = new ManualPromise<void>();
    this.onProviderElection = options.onProviderElection ?? (() => {});

    this._registerNode();

    setTimeout(async () => {
      tempGlobalLogger.debug(
        `Checking if service node is registered, current value is ${this.serviceNode}`
      );
      if (!this.serviceNode) {
        tempGlobalLogger.debug(
          "Service node did not register as a provider nor as a client, retrying..."
        );
        retry(async () => {
          console.log("Retrying...");
          await this._registerNode();
          if (!this.serviceNode) {
            throw new Error(
              "Service node did not register as a provider nor as a client"
            );
          }
        });
      }
    }, 80);
  }

  get ready() {
    return this.readyState.promise;
  }

  get isProvider() {
    return this.serviceNode instanceof SharedServiceProvider;
  }

  private async _registerNode() {
    console.log("CALLING _registerNode");
    const lockName = SharedServiceUtils.getLockName(this.serviceName);

    const locks = await navigator.locks.query();
    const sharedServiceLockExists = locks.held?.some(
      (lock) => lock.name === lockName
    );

    tempGlobalLogger.debug(
      `Shared service lock exists: ${sharedServiceLockExists}`
    );

    if (sharedServiceLockExists) {
      tempGlobalLogger.info(
        `Service ${this.serviceName} has a provider, registering as client`
      );
      this.serviceNode = new SharedServiceClient<T>({
        serviceName: this.serviceName,
        readyState: this.readyState,
        onProviderElection: this.onProviderElection,
      });
    }

    createInfinitelyOpenLock(lockName, () => {
      tempGlobalLogger.info(
        `Service ${this.serviceName} has no provider, registering as provider`
      );
      this.serviceNode = new SharedServiceProvider<T>({
        serviceName: this.serviceName,
        service: this.service,
        readyState: this.readyState,
        onProviderElection: this.onProviderElection,
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

class SharedServiceProvider<T extends object> implements SharedServiceNode<T> {
  private readonly serviceName: string;
  private readonly service: T;
  private readonly readyState: ManualPromise<void>;
  private readonly sharedChannel: BroadcastChannel;
  private readonly registeredClients: Set<string>;
  private readonly requestsInProcess: Set<string>;
  private readonly providerInFlightRequestsStore?: ProviderInFlightRequestsKeyValueStore<T>;
  private readonly onProviderElection: OnProviderElection;

  constructor(options: CreateSharedServiceProviderOptions<T>) {
    this.serviceName = options.serviceName;
    this.service = options.service;
    this.readyState = options.readyState;
    this.onProviderElection = options.onProviderElection;
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
      this.onProviderElection(true),
      this._handlePreviousProviderUnfinishedRequests(),
    ]);
    this.readyState.resolve();
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
            const { nonce, method, args } = e.data.payload;

            if (this.requestsInProcess.has(nonce)) {
              tempGlobalLogger.warn(
                `Request with nonce ${nonce} already in process`
              );
              return;
            }
            this.requestsInProcess.add(nonce);

            tempGlobalLogger.info(
              `Received request from client ${clientId} with nonce ${nonce} to call method ${String(
                method
              )} with args ${JSON.stringify(args)}`
            );

            let result: unknown;
            let error: unknown;
            try {
              result = await (this.service[method] as T[keyof T] & Function)(
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

  private async _handlePreviousProviderUnfinishedRequests() {
    if (this.providerInFlightRequestsStore === undefined) return;

    const unfinishedRequests =
      await this.providerInFlightRequestsStore.getAll();
    if (unfinishedRequests.length > 0) {
      await Promise.allSettled(
        unfinishedRequests.map(async ({ nonce, method, args }) => {
          try {
            const methodToCall = this.service[method];
            if (typeof methodToCall !== "function") {
              throw new Error(`Method ${String(method)} is not a function`);
            }
            await methodToCall(...args);
            this.providerInFlightRequestsStore?.delete(nonce);
          } catch (error) {
            tempGlobalLogger.error(
              `Error occurred while invoking method ${String(method)}: ${error}`
            );
          } finally {
            this.providerInFlightRequestsStore?.delete(nonce);
          }
        })
      );
    }
  }

  async callServiceMethod(method: keyof T, args: unknown[]) {
    return (this.service[method] as T[keyof T] & Function)(...args);
  }
}

class SharedServiceClient<T extends object> implements SharedServiceNode<T> {
  private readonly id: string;
  private readonly serviceName: string;
  private readonly readyState: ManualPromise<void>;
  private readonly onProviderElection: OnProviderElection;
  private readonly sharedChannel: BroadcastChannel;
  private readonly clientChannel: BroadcastChannel;
  private readonly requestsInFlight: Map<string, InFlightRequest<T>>;

  constructor(options: CreateSharedServiceClientOptions) {
    this.id = SharedServiceUtils.generateId();
    this.serviceName = options.serviceName;
    this.readyState = options.readyState;
    this.onProviderElection = options.onProviderElection;
    this.sharedChannel = new BroadcastChannel(
      SharedServiceUtils.getSharedChannelName(options.serviceName)
    );
    this.clientChannel = new BroadcastChannel(
      SharedServiceUtils.getClientChannelName(options.serviceName, this.id)
    );
    this.requestsInFlight = new Map();
    this._init();
  }

  private async _init() {
    const clientLockName = SharedServiceUtils.getClientLockName(
      this.serviceName,
      this.id
    );
    createInfinitelyOpenLock(clientLockName, () => {
      this._registerWithProvider();
      console.log("AAAA");
    });
    this._handleProviderElection();
    this.readyState.resolve();
  }

  private _handleProviderElection() {
    this.sharedChannel.addEventListener(
      "message",
      async (e: MessageEvent<SharedChannelEventData>) => {
        const { type } = e.data;
        if (type !== "provider-elected") return;

        this.readyState.reset();

        await this._registerWithProvider();

        this.readyState.resolve();

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
    await this.onProviderElection(false);
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
