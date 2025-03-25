type OnConsumerChange = (isConsumer: boolean) => void | Promise<void>;

type SharedServiceOptions<T extends object> = {
  serviceName: string;
  service: T;
  onConsumerChange?: OnConsumerChange;
};

type InFlightRequest<T extends object, K extends keyof T = keyof T> = {
  method: K;
  args: unknown[];
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

type RequestEventData<T extends object, K extends keyof T = keyof T> = {
  type: "request";
  payload: {
    nonce: string;
    method: K;
    args: unknown[];
  };
};

type ResponseEventData<T extends object, K extends keyof T = keyof T> = {
  type: "response";
  payload: {
    nonce: string;
    result: T[K];
    error: unknown;
  };
};

type ProducerRegistrationEventData = {
  type: "producer-registration";
  payload: {
    producerId: string;
  };
};

type ProducerRegisteredEventData = {
  type: "producer-registered";
  payload: {
    producerId: string;
  };
};

type ConsumerChangeEventData = {
  type: "consumer-change";
};

type SharedChannelEventData =
  | ProducerRegistrationEventData
  | ProducerRegisteredEventData
  | ConsumerChangeEventData;

type ProducerChannelEventData<T extends object, K extends keyof T = keyof T> =
  | RequestEventData<T, K>
  | ResponseEventData<T, K>;

function generateId() {
  if (typeof crypto !== "undefined") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Creates an exclusive {@link https://developer.mozilla.org/en-US/docs/Web/API/Lock Web Lock} with an unresolved promise.
 * This lock will never be released until the context is destroyed. This is useful for tracking the lifetime of the context and implementing a context queue.
 */
function createInfinitelyOpenLock(
  name: string,
  callback?: () => void | Promise<void>
) {
  navigator.locks.request(name, { mode: "exclusive" }, async () => {
    if (callback !== undefined) {
      await callback();
    }
    await new Promise(() => {});
  });
}

class SharedService<T extends object> {
  readonly service: T;
  private readonly serviceName: string;
  private readonly sharedChannel: BroadcastChannel;
  private isConsumer: boolean;
  private producerChannel: BroadcastChannel | null;
  private readonly onConsumerChange?: OnConsumerChange;
  private readonly requestsInFlight: Map<string, InFlightRequest<T>>;

  constructor(options: SharedServiceOptions<T>) {
    this.serviceName = options.serviceName;
    this.service = new Proxy(options.service, {
      //! this has to be an arrow function to keep the context of `this`
      get: (target, property) => {
        if (typeof property === "symbol") return undefined;

        const typedProperty = property as keyof T;
        const typedPropertyValue = target[typedProperty];

        if (typeof typedPropertyValue !== "function") return typedPropertyValue;

        //! this has to be an arrow function to keep the context of `this`
        return async (...args: unknown[]) => {
          if (this.isConsumer) {
            return await typedPropertyValue(...args);
          }

          return new Promise((resolve, reject) => {
            const nonce = generateId();
            const responseListener = this._createResponseListener(
              nonce,
              resolve,
              reject
            );
            this.producerChannel?.addEventListener("message", responseListener);
            this.producerChannel?.postMessage({
              type: "request",
              payload: {
                nonce,
                method: property,
                args,
              },
            });
            this.requestsInFlight.set(nonce, {
              method: typedProperty,
              args,
              resolve,
              reject,
            });
          });
        };
      },
    });
    this.sharedChannel = new BroadcastChannel(
      `shared-service:${this.serviceName}`
    );
    this.isConsumer = false;
    this.producerChannel = null;
    this.requestsInFlight = new Map();
    this.onConsumerChange = options.onConsumerChange;

    this._onBecomeProducer();
    createInfinitelyOpenLock(`shared-service:${this.serviceName}`, async () => {
      await this._onBecomeConsumer();
    });
  }

  private async _onBecomeConsumer() {
    this.isConsumer = true;
    this.producerChannel = null;

    // listen to newly registered consumers
    this.sharedChannel.addEventListener(
      "message",
      (event: MessageEvent<ProducerRegistrationEventData>) => {
        const { type, payload } = event.data;
        if (type !== "producer-registration") return;

        const { producerId } = payload;

        const producerChannel = new BroadcastChannel(
          `shared-service-producer:${this.serviceName}-${producerId}`
        );
        navigator.locks.request(
          `shared-service-producer:${this.serviceName}-${producerId}`,
          { mode: "exclusive" },
          () => {
            producerChannel.close();
          }
        );

        producerChannel.addEventListener(
          "message",
          (event: MessageEvent<ProducerChannelEventData<T>>) => {
            if (event.data.type === "response") return;
            const { nonce, method, args } = event.data.payload;

            let result: unknown = null;
            let error: unknown = null;
            try {
              if (typeof this.service[method] !== "function") {
                throw new Error(`Method ${String(method)} is not a function`);
              }
              result = this.service[method](...args);
            } catch (e) {
              error = e;
            }

            producerChannel.postMessage({
              type: "response",
              payload: {
                nonce,
                result,
                error,
              },
            });
          }
        );

        this.sharedChannel.postMessage({
          type: "producer-registered",
          payload: { producerId },
        });
      }
    );

    this.sharedChannel.postMessage({ type: "consumer-change" });

    await this.onConsumerChange?.(this.isConsumer);

    if (this.requestsInFlight.size > 0) {
      for (const [nonce, { method, args, resolve, reject }] of this
        .requestsInFlight) {
        try {
          const requestMethodValue = this.service[method];
          if (typeof requestMethodValue !== "function") {
            throw new Error(`Method ${String(method)} is not a function`);
          }
          const result = await requestMethodValue(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.requestsInFlight.delete(nonce);
        }
      }
    }
  }

  private _onBecomeProducer() {
    const producerId = generateId();
    // create a lock for the producer, so that when this lock is released, the consumer knows the provider is gone and can close the channel
    createInfinitelyOpenLock(
      `shared-service-producer:${this.serviceName}-${producerId}`
    );
    this.producerChannel = new BroadcastChannel(
      `shared-service-producer:${this.serviceName}-${producerId}`
    );

    const register = async () => {
      await new Promise<void>((resolve) => {
        const onRegisteredListener = (
          event: MessageEvent<SharedChannelEventData>
        ) => {
          if (
            event.data.type === "producer-registered" &&
            event.data.payload.producerId === producerId
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
          type: "producer-registration",
          payload: { producerId },
        });
      });
    };

    this.sharedChannel.addEventListener(
      "message",
      async (event: MessageEvent<SharedChannelEventData>) => {
        if (event.data.type === "consumer-change" && !this.isConsumer) {
          await this.onConsumerChange?.(this.isConsumer);
          await register();

          if (this.requestsInFlight.size > 0) {
            for (const [nonce, { method, args, resolve, reject }] of this
              .requestsInFlight) {
              const responseListener = this._createResponseListener(
                nonce,
                resolve,
                reject
              );
              this.producerChannel?.addEventListener(
                "message",
                responseListener
              );
              this.producerChannel?.postMessage({
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
      }
    );
  }

  private _createResponseListener(
    nonce: string,
    resolve: (value: unknown) => void,
    reject: (reason?: unknown) => void
  ) {
    const listener = (event: MessageEvent<ProducerChannelEventData<T>>) => {
      const { type, payload } = event.data;
      if (type === "request" || payload.nonce !== nonce) return;

      const { result, error } = payload;

      if (error) {
        reject(error);
      } else {
        resolve(result);
      }

      this.requestsInFlight.delete(nonce);
      this.producerChannel?.removeEventListener("message", listener);
    };

    return listener;
  }
}

export function createSharedService<T extends object>(
  options: SharedServiceOptions<T>
) {
  return new SharedService(options);
}
