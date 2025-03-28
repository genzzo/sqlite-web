type OnConsumerChange = (isConsumer: boolean) => void | Promise<void>;

type SharedServiceOptions<T extends object> = {
  serviceName: string;
  service: T;
  onConsumerChange?: OnConsumerChange;
  logLevel?: "debug" | "info" | "warn" | "error";
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

class SharedService<T extends object> {
  readonly serviceProxy: SharedServiceProxy<T>;
  private readonly serviceName: string;
  private readonly sharedChannel: BroadcastChannel;
  private isConsumer: boolean;
  private producerChannel: BroadcastChannel | null;
  private readonly onConsumerChange?: OnConsumerChange;
  private readonly requestsInFlight: Map<string, InFlightRequest<T>>;
  private readonly logger: ReturnType<typeof createLogger>;

  constructor(options: SharedServiceOptions<T>) {
    this.serviceName = options.serviceName;
    this.serviceProxy = new Proxy(options.service, {
      get: (target, property) => {
        if (typeof property === "symbol") return undefined;

        const typedProperty = property as keyof T;
        const typedPropertyValue = target[typedProperty];

        if (typeof typedPropertyValue !== "function") {
          this.logger.debug(
            `Property ${String(
              property
            )} is not a function, returning the property value`
          );
          return typedPropertyValue;
        }

        return async (...args: unknown[]) => {
          if (this.isConsumer) {
            this.logger.debug(
              `Consumer invoking method ${String(property)} with args`,
              args
            );
            return await typedPropertyValue(...args);
          }

          this.logger.debug(
            `Producer invoking method ${String(
              property
            )} with args, sending request to consumer`,
            args
          );

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
    }) as SharedServiceProxy<T>;
    this.sharedChannel = new BroadcastChannel(
      `shared-service:${this.serviceName}`
    );
    this.isConsumer = false;
    this.producerChannel = null;
    this.requestsInFlight = new Map();
    this.onConsumerChange = options.onConsumerChange;
    this.logger = createLogger(
      `shared-service:${this.serviceName}`,
      options.logLevel ?? "info"
    );

    this._register();
  }

  private async _register() {
    const registrationExists = !!sessionStorage.getItem(
      `shared-service-registration:${this.serviceName}`
    );
    if (!registrationExists) {
      sessionStorage.setItem(
        `shared-service-registration:${this.serviceName}`,
        "true"
      );
    }
    if (registrationExists) {
      this.logger.info("Consumer exists, becoming producer...");
      this._onBecomeProducer();
    }
    createInfinitelyOpenLock(`shared-service:${this.serviceName}`, async () => {
      this.logger.info("Consumer does not exist, becoming consumer...");
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

        this.logger.info(
          `Producer with id ${producerId} is registering, creating channel...`
        );

        const producerChannel = new BroadcastChannel(
          `shared-service-producer:${this.serviceName}-${producerId}`
        );
        navigator.locks.request(
          `shared-service-producer:${this.serviceName}-${producerId}`,
          { mode: "exclusive" },
          () => {
            this.logger.info(
              `Producer with id ${producerId} has disconnected, closing channel`
            );
            producerChannel.close();
          }
        );

        producerChannel.addEventListener(
          "message",
          async (event: MessageEvent<ProducerChannelEventData<T>>) => {
            if (event.data.type === "response") return;
            const { nonce, method, args } = event.data.payload;

            this.logger.info(
              `Received request with nonce ${nonce} for method ${String(
                method
              )} with args`,
              args
            );

            let result: unknown = null;
            let error: unknown = null;
            try {
              if (typeof this.serviceProxy[method] !== "function") {
                throw new Error(
                  `Expected to receive a function, but received ${String(
                    method
                  )}`
                );
              }
              result = await this.serviceProxy[method](...args);
            } catch (e) {
              this.logger.error(
                `Error occurred while invoking method ${String(method)}: ${e}`
              );
              error = e;
            }

            this.logger.debug(
              `Sending response with nonce ${nonce} for method ${String(
                method
              )} with result`,
              result
            );

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

        this.logger.info(`Producer with id ${producerId} registered`);

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
          const requestMethodValue = this.serviceProxy[method];
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

  private async _onBecomeProducer() {
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
        if (event.data.type === "consumer-change") {
          if (this.isConsumer) {
            throw new Error("Producer cannot become consumer");
          }

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
  return new SharedService(options).serviceProxy;
}
