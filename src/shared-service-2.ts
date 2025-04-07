type OnConsumerChange = (isConsumer: boolean) => void | Promise<void>;

type CreateSharedServiceOptions<T extends object> = {
  serviceName: string;
  service: T;
  onConsumerChange?: OnConsumerChange;
};

type CreateSharedServiceProviderOptions<T extends object> = {
  serviceName: string;
  service: T;
  sharedChannelName: string;
  onReady: () => void | Promise<void>;
};

type CreateSharedServiceClientOptions<T extends object> = {
  sharedChannelName: string;
};

type SharedServiceProxy<T extends object> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : T[K];
};

function generateId() {
  return crypto.randomUUID();
}

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

class SharedService<T extends object> {
  private readonly serviceName: string;
  private readonly service: T;
  readonly serviceProxy: SharedServiceProxy<T>;
  readonly ready: ManualPromise<void>;
  private serviceNode?: SharedServiceProvider<T> | SharedServiceClient<T>;

  constructor(options: CreateSharedServiceOptions<T>) {
    this.serviceName = options.serviceName;
    this.service = options.service;
    this.serviceProxy = this._createProxy();
    this.ready = new ManualPromise<void>();

    this._registerNode();
  }

  private get serviceLockName() {
    return `shared-service:${this.serviceName}`;
  }

  private get serviceChannelName() {
    return `shared-service:${this.serviceName}`;
  }

  private async _registerNode() {
    const locks = await navigator.locks.query();
    const sharedServiceLockExists = locks.held?.some(
      (lock) => lock.name === this.serviceLockName
    );

    if (sharedServiceLockExists) {
      this.serviceNode = new SharedServiceClient<T>({
        sharedChannelName: this.serviceChannelName,
      });
    }

    createInfinitelyOpenLock(this.serviceLockName, () => {
      this.serviceNode = new SharedServiceProvider<T>({
        serviceName: this.serviceName,
        service: this.service,
        sharedChannelName: this.serviceChannelName,
        onReady: () => {
          this.ready.resolve();
        },
      });
    });
  }

  private _createProxy() {
    return new Proxy(this.service, {
      get: (target, property) => {
        return async (...args: unknown[]) => {
          await this.ready.promise;

          if (this.serviceNode === undefined) {
            throw new Error("Service node is not defined");
          }

          validateProxyProperty(target, property);

          const propertyValue = target[property];

          if (typeof propertyValue !== "function") {
            return propertyValue;
          }

          return this.serviceNode.callServiceMethod(propertyValue, args);
        };
      },
    }) as SharedServiceProxy<T>;
  }
}

class SharedServiceProvider<T extends object> {
  private readonly serviceName: string;
  private readonly sharedChannel: BroadcastChannel;
  private readonly service: T;

  constructor(options: CreateSharedServiceProviderOptions<T>) {
    this.serviceName = options.serviceName;
    this.service = options.service;
    this.sharedChannel = new BroadcastChannel(options.sharedChannelName);
    this._init();
  }

  private _init() {
    this.sharedChannel.addEventListener("message", (e) => {
      const { type, payload } = e.data;
      if (type !== "client-registration") return;
      console.log(payload, e.ports);
    });
  }

  callServiceMethod(method: T[keyof T] & Function, args: unknown[]) {
    return method(...args);
  }
}

class SharedServiceClient<T extends object> {
  private readonly sharedChannel: BroadcastChannel;
  private readonly providerMessagePort: MessagePort;

  constructor(options: CreateSharedServiceClientOptions<T>) {
    this.sharedChannel = new BroadcastChannel(options.sharedChannelName);

    const { port1: clientMessagePort, port2: providerMessagePort } =
      new MessageChannel();

    this.sharedChannel.postMessage({
      type: "client-registration",
      payload: {
        clientMessagePort: () => {},
      },
    });

    this.providerMessagePort = providerMessagePort;
  }

  callServiceMethod(method: T[keyof T] & Function, args: unknown[]) {
    return method(...args);
  }
}

export function createNewSharedService<T extends object>(
  options: CreateSharedServiceOptions<T>
) {
  return new SharedService(options);
}
