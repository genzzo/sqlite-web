export async function retry<T>(
  fn: () => T | Promise<T>,
  options: {
    retries: number;
    delay: number | ((attempt: number) => number);
  } = {
    retries: 3,
    delay: (attempt: number) => Math.pow(2, attempt) * 250,
  },
) {
  const { retries, delay } = options;
  if (retries < 0) {
    throw new Error("Retries must be greater than or equal to 0");
  }

  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > retries) {
        throw new Error(
          `Function failed after ${retries + 1} attempts. Error: ${error}`,
        );
      }
      const currentDelay = typeof delay === "function" ? delay(attempt) : delay;
      await new Promise((res) => setTimeout(res, currentDelay));
    }
  }
}

type ManualPromiseOptions<E = unknown> = {
  /**
   * Forces the promise to be reset, even if it is not awaiting. Defaults to false.
   */
  forceReset?: boolean;
  /**
   * The reason for rejecting the promise when it is reset. This is only used when the promise is still awaiting. Defaults to `"PROMISE_RESET_WHILE_AWAITING"`.
   */
  onPendingResetRejectionReason?: E;
};

export class ManualPromise<T, E = unknown> {
  isAwaiting: boolean;
  private readonly options: ManualPromiseOptions<E>;
  private _internalPromise: Promise<T>;
  private _internalResolve: (value: T) => void;
  private _internalReject: (reason?: E) => void;

  constructor(options?: ManualPromiseOptions<E>) {
    this.isAwaiting = true;
    this.options = {
      forceReset: false,
      onPendingResetRejectionReason: "PROMISE_RESET_WHILE_AWAITING" as E,
      ...options,
    };

    this._internalResolve = this._noop;
    this._internalReject = this._noop;

    this._internalPromise = new Promise<T>((promiseResolve, promiseReject) => {
      this._internalResolve = (value) => {
        promiseResolve(value);
        this.isAwaiting = false;
        this._resetCallbacks();
      };
      this._internalReject = (reason) => {
        promiseReject(reason);
        this.isAwaiting = false;
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
    if (this.isAwaiting && !this.options.forceReset) {
      return;
    }

    this._internalReject(this.options.onPendingResetRejectionReason);

    this.isAwaiting = true;
    this._resetCallbacks();
    this._internalPromise = new Promise<T>((promiseResolve, promiseReject) => {
      this._internalResolve = (value) => {
        promiseResolve(value);
        this.isAwaiting = false;
        this._resetCallbacks();
      };
      this._internalReject = (reason) => {
        promiseReject(reason);
        this.isAwaiting = false;
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
