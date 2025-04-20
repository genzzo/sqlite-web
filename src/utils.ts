/// <reference lib="webworker" />

type ManualPromiseOptions<E = unknown> = {
  /**
   * Forces the promise to be reset, even if it is not pending. Defaults to false.
   */
  forceReset?: boolean;
  /**
   * The reason for rejecting the promise when it is reset. This is only used when the promise is still pending or when `forceReset` is set to true. Defaults to `"PROMISE_RESET_WHILE_PENDING"`.
   */
  onPendingResetRejectionReason?: E;
};

type ManualPromiseResetOptions<E> = {
  /**
   * Forces the promise to be reset, even if it is not pending. Defaults to false.
   */
  force?: boolean;
  /**
   * The reason for rejecting the promise when it is reset. This is only used when the promise is still pending or when `force` is set to true. Defaults to the `onPendingResetRejectionReason` provided in the constructor or `"PROMISE_RESET_WHILE_PENDING"`.
   */
  onPendingRejectionReason?: E;
};

export class ManualPromise<T, E = unknown> {
  isPending: boolean;
  private readonly options: ManualPromiseOptions<E>;
  private _internalPromise: Promise<T>;
  private _internalResolve: (value: T) => void;
  private _internalReject: (reason?: E) => void;

  constructor(options?: ManualPromiseOptions<E>) {
    this.isPending = true;
    this.options = {
      forceReset: false,
      onPendingResetRejectionReason: "PROMISE_RESET_WHILE_PENDING" as E,
      ...options,
    };

    this._internalResolve = this._noop;
    this._internalReject = this._noop;

    this._internalPromise = new Promise<T>((promiseResolve, promiseReject) => {
      this._internalResolve = (value) => {
        promiseResolve(value);
        this.isPending = false;
        this._resetCallbacks();
      };
      this._internalReject = (reason) => {
        promiseReject(reason);
        this.isPending = false;
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

  reset(options?: ManualPromiseResetOptions<E>) {
    const { force, onPendingRejectionReason } = {
      force: false,
      onPendingRejectionReason: this.options.onPendingResetRejectionReason,
      ...options,
    };

    if (this.isPending && !force) return;

    this._internalReject(onPendingRejectionReason);

    this.isPending = true;
    this._resetCallbacks();
    this._internalPromise = new Promise<T>((promiseResolve, promiseReject) => {
      this._internalResolve = (value) => {
        promiseResolve(value);
        this.isPending = false;
        this._resetCallbacks();
      };
      this._internalReject = (reason) => {
        promiseReject(reason);
        this.isPending = false;
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

export function isBrowserContext() {
  return (
    typeof window !== "undefined" ||
    self instanceof WorkerGlobalScope ||
    self instanceof DedicatedWorkerGlobalScope ||
    self instanceof SharedWorkerGlobalScope ||
    self instanceof ServiceWorkerGlobalScope
  );
}

export function defineWorkerApi<T extends Record<string, unknown>>(
  worker: DedicatedWorkerGlobalScope,
  api: T
) {
  type MessageEventData = {
    property: keyof T;
    args?: unknown[];
  };

  const apiMethods = Object.keys(api) as (keyof T)[];

  worker.addEventListener("message", async (e: MessageEvent<unknown>) => {
    const data = e.data;
    if (typeof data !== "object" || !data || !("property" in data))
      throw new Error("Invalid message data");

    if (!apiMethods.includes(data.property as keyof T)) {
      throw new Error(`Unknown property: ${data.property}`);
    }

    if ("args" in data && !Array.isArray(data.args)) {
      throw new Error(
        `Invalid args. Expected an optional array, received ${typeof data.args}`
      );
    }

    const { property, args = [] } = data as MessageEventData;

    let result: unknown;
    let error: unknown;
    try {
      const propertyValue = api[property];

      if (typeof propertyValue !== "function") {
        result = propertyValue;
      } else {
        result = await propertyValue(...args);
      }
    } catch (e) {
      error = e;
    }

    const sender = e.ports[0];

    sender.postMessage({
      result,
      error,
    });
  });
}

export type ProxyClient<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? R extends Promise<unknown>
      ? T[K]
      : (...args: A) => Promise<R>
    : () => Promise<T[K]>;
};

export function createWorkerClient<T extends object>(
  worker: Worker
): ProxyClient<T> {
  const proxyHandler: ProxyHandler<T> = {
    get: (_target, property) => {
      return (...args: any[]) => {
        return new Promise((resolve, reject) => {
          const channel = new MessageChannel();

          channel.port1.onmessage = (event) => {
            const { result, error } = event.data;

            channel.port1.close();

            if (error !== undefined) {
              reject(error);
            } else {
              resolve(result);
            }
          };

          worker.postMessage(
            {
              property,
              args,
            },
            [channel.port2]
          );
        });
      };
    },
  };

  return new Proxy({} as T, proxyHandler) as ProxyClient<T>;
}
