type OnConsumerChange = (isConsumer: boolean) => void | Promise<void>;

type CreateSharedServiceOptions<T extends object> = {
  serviceName: string;
  service: T;
  onConsumerChange?: OnConsumerChange;
};

type CreateSharedServiceProviderOptions<T extends object> = {
  serviceName: string;
  service: T;
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

class ManualPromise<T> {
  private _internalPromise: Promise<T>;
  private internalResolve: (value: T) => void;
  private internalReject: (reason?: unknown) => void;

  constructor() {
    this.internalResolve = this.noop;
    this.internalReject = this.noop;

    this._internalPromise = new Promise<T>((promiseResolve, promiseReject) => {
      this.internalResolve = (value) => {
        promiseResolve(value);
        this.resetCallbacks();
      };
      this.internalReject = (reason) => {
        promiseReject(reason);
        this.resetCallbacks();
      };
    });
  }

  get promise() {
    return this._internalPromise;
  }

  resolve(value: T) {
    this.internalResolve(value);
  }

  reject(reason?: unknown) {
    this.internalReject(reason);
  }

  reset() {
    this.resetCallbacks();
    this._internalPromise = new Promise<T>((promiseResolve, promiseReject) => {
      this.internalResolve = (value) => {
        promiseResolve(value);
        this.resetCallbacks();
      };
      this.internalReject = (reason) => {
        promiseReject(reason);
        this.resetCallbacks();
      };
    });
  }

  private resetCallbacks() {
    this.internalResolve = this.noop;
    this.internalReject = this.noop;
  }

  private noop = () => {};
}

class SharedService<T extends object> {
  private readonly serviceName: string;
  private readonly service: T;
  readonly serviceProxy: SharedServiceProxy<T>;
  private readonly providerClientId: ManualPromise<string>;
  readonly ready: ManualPromise<void>;
  private serviceNode?: SharedServiceProvider<T> | SharedServiceClient<T>;

  constructor(options: CreateSharedServiceOptions<T>) {
    this.serviceName = options.serviceName;
    this.service = options.service;
    this.serviceProxy = this._createProxy();
    this.providerClientId = new ManualPromise<string>();
    this.ready = new ManualPromise<void>();

    this._register();
  }

  private get serviceLockName() {
    return `shared-service:${this.serviceName}`;
  }

  private async _register() {
    const locks = await navigator.locks.query();
    const sharedServiceLockExists = locks.held?.some(
      (lock) => lock.name === this.serviceLockName
    );

    if (sharedServiceLockExists) {
      const providerClientId = await this.providerClientId.promise;
      this.serviceNode = new SharedServiceClient<T>();
    }

    createInfinitelyOpenLock(this.serviceLockName, () => {
      this.serviceNode = new SharedServiceProvider<T>({
        serviceName: this.serviceName,
        service: this.service,
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
  private readonly service: T;

  constructor(options: CreateSharedServiceProviderOptions<T>) {
    this.serviceName = options.serviceName;
    this.service = options.service;
  }

  callServiceMethod(method: T[keyof T] & Function, args: unknown[]) {
    return method(...args);
  }
}

class SharedServiceClient<T extends object> {
  private readonly providerClientId: string;

  constructor() {
    this.providerClientId = "temp...";
  }

  async _createProviderMessageChannel() {
    const channel = new MessageChannel();
    const providerClientId = this.providerClientId;

    channel.port1.onmessage = async (event) => {
      const { result, error } = event.data;

      if (error !== undefined) {
        throw error;
      }

      return result;
    };

    return channel;
  }

  callServiceMethod(method: T[keyof T] & Function, args: unknown[]) {
    return method(...args);
  }
}
