// import { IDBKeyValueStore, KeyValueStore } from "./kv-stores";

// type OnConsumerChange = (isConsumer: boolean) => void | Promise<void>;

// type Logger = {
//   debug: (...args: unknown[]) => void;
//   info: (...args: unknown[]) => void;
//   warn: (...args: unknown[]) => void;
//   error: (...args: unknown[]) => void;
// };

// type SharedServiceOptions<T extends object> = {
//   serviceName: string;
//   service: T;
//   onConsumerChange?: OnConsumerChange;
//   logger?: Logger;
//   logLevel?: "debug" | "info" | "warn" | "error";
// };

// type InFlightRequest<T extends object, K extends keyof T = keyof T> = {
//   method: K;
//   args: unknown[];
//   resolve: (value: unknown) => void;
//   reject: (reason?: unknown) => void;
// };

// type RequestEventData<T extends object, K extends keyof T = keyof T> = {
//   type: "request";
//   payload: {
//     nonce: string;
//     method: K;
//     args: unknown[];
//   };
// };

// type ResponseEventData<T extends object, K extends keyof T = keyof T> = {
//   type: "response";
//   payload: {
//     nonce: string;
//     result: T[K];
//     error: unknown;
//   };
// };

// type ProducerRegistrationEventData = {
//   type: "producer-registration";
//   payload: {
//     producerId: string;
//   };
// };

// type ProducerRegisteredEventData = {
//   type: "producer-registered";
//   payload: {
//     producerId: string;
//   };
// };

// type ConsumerChangeEventData = {
//   type: "consumer-change";
// };

// type SharedChannelEventData =
//   | ProducerRegistrationEventData
//   | ProducerRegisteredEventData
//   | ConsumerChangeEventData;

// type ProducerChannelEventData<T extends object, K extends keyof T = keyof T> =
//   | RequestEventData<T, K>
//   | ResponseEventData<T, K>;

// type SharedServiceProxy<T extends object> = {
//   [K in keyof T]: T[K] extends (...args: infer A) => infer R
//     ? (...args: A) => Promise<R>
//     : T[K];
// };

// function generateId() {
//   return crypto.randomUUID();
// }

// async function retry<T>(
//   fn: () => T | Promise<T>,
//   options: {
//     retries: number;
//     delay: number | ((attempt: number) => number);
//   } = {
//     retries: 3,
//     delay: (attempt: number) => Math.pow(2, attempt) * 250,
//   }
// ) {
//   const { retries, delay } = options;
//   if (retries < 0) {
//     throw new Error("Retries must be greater than or equal to 0");
//   }
//   if (typeof delay !== "number" && typeof delay !== "function") {
//     throw new Error("Delay must be a number or a function");
//   }

//   let attempt = 0;

//   while (attempt <= retries) {
//     try {
//       return await fn();
//     } catch (error) {
//       attempt++;
//       if (attempt > retries) {
//         throw new Error(
//           `Function failed after ${retries + 1} attempts. Error: ${error}`
//         );
//       }
//       const currentDelay = typeof delay === "function" ? delay(attempt) : delay;
//       await new Promise((res) => setTimeout(res, currentDelay));
//     }
//   }
// }

// /**
//  * Creates an exclusive {@link https://developer.mozilla.org/en-US/docs/Web/API/Lock Web Lock} with an unresolved promise.
//  * This lock will never be released until the context is destroyed. This is useful for tracking the lifetime of the context and implementing a context queue.
//  */
// function createInfinitelyOpenLock(
//   name: string,
//   callback?: (lock: Lock | null) => void | Promise<void>
// ) {
//   navigator.locks.request(name, { mode: "exclusive" }, async (lock) => {
//     if (callback !== undefined) {
//       await callback(lock);
//     }
//     await new Promise(() => {});
//   });
// }

// function createLogger(
//   serviceName: string,
//   logLevel: "none" | "debug" | "info" | "warn" | "error"
// ) {
//   const logLevelMap = {
//     none: 0,
//     error: 1,
//     warn: 2,
//     info: 3,
//     debug: 4,
//   };

//   return {
//     debug: (...args: unknown[]) => {
//       if (logLevelMap[logLevel] >= logLevelMap.debug) {
//         console.debug(`[${serviceName}]`, ...args);
//       }
//     },
//     info: (...args: unknown[]) => {
//       if (logLevelMap[logLevel] >= logLevelMap.info) {
//         console.info(`[${serviceName}]`, ...args);
//       }
//     },
//     warn: (...args: unknown[]) => {
//       if (logLevelMap[logLevel] >= logLevelMap.warn) {
//         console.warn(`[${serviceName}]`, ...args);
//       }
//     },
//     error: (...args: unknown[]) => {
//       if (logLevelMap[logLevel] >= logLevelMap.error) {
//         console.error(`[${serviceName}]`, ...args);
//       }
//     },
//   };
// }

// class SharedService<T extends object> {
//   readonly serviceProxy: SharedServiceProxy<T>;
//   private readonly serviceName: string;
//   private readonly sharedChannel: BroadcastChannel;
//   private isConsumer: boolean;
//   private producerChannel: BroadcastChannel | null;
//   private readonly onConsumerChange?: OnConsumerChange;
//   private readonly producedRequestsInFlight: Map<string, InFlightRequest<T>>;
//   private readonly consumedRequestsInProcess: Set<string>;
//   private readonly consumerInFlightRequestsStore: KeyValueStore<
//     Omit<InFlightRequest<T>, "resolve" | "reject"> & {
//       nonce: string;
//     }
//   >;
//   private readonly registeredProducers: Set<string>;
//   private readonly logger: Logger;
//   ready: Promise<void>;
//   private readyResolve: (() => void) | null;

//   constructor(options: SharedServiceOptions<T>) {
//     this.serviceName = options.serviceName;
//     this.serviceProxy = new Proxy(options.service, {
//       get: (target, property) => {
//         if (typeof property === "symbol") return undefined;

//         const typedProperty = property as keyof T;
//         const typedPropertyValue = target[typedProperty];

//         if (typeof typedPropertyValue !== "function") {
//           this.logger.debug(
//             `Property ${String(
//               property
//             )} is not a function, returning the property value`
//           );
//           return typedPropertyValue;
//         }

//         return async (...args: unknown[]) => {
//           await this.ready;

//           if (this.isConsumer) {
//             this.logger.debug(
//               `Consumer invoking method ${String(property)} with args`,
//               args
//             );

//             const nonce = generateId();
//             await this.consumerInFlightRequestsStore.set(nonce, {
//               nonce,
//               method: typedProperty,
//               args,
//             });

//             const returnValue = await typedPropertyValue(...args);
//             this.consumerInFlightRequestsStore.delete(nonce);
//             return returnValue;
//           }

//           this.logger.debug(
//             `Producer invoking method ${String(
//               property
//             )} with args, sending request to consumer`,
//             args
//           );

//           return new Promise((resolve, reject) => {
//             const nonce = generateId();
//             const responseListener = this._createResponseListener(
//               nonce,
//               resolve,
//               reject
//             );
//             this.producerChannel?.addEventListener("message", responseListener);
//             this.producerChannel?.postMessage({
//               type: "request",
//               payload: {
//                 nonce,
//                 method: property,
//                 args,
//               },
//             });
//             this.producedRequestsInFlight.set(nonce, {
//               method: typedProperty,
//               args,
//               resolve,
//               reject,
//             });
//           });
//         };
//       },
//     }) as SharedServiceProxy<T>;
//     this.sharedChannel = new BroadcastChannel(
//       `shared-service:${this.serviceName}`
//     );
//     this.isConsumer = false;
//     this.producerChannel = null;
//     this.producedRequestsInFlight = new Map();
//     this.consumedRequestsInProcess = new Set();
//     this.registeredProducers = new Set();
//     this.onConsumerChange = options.onConsumerChange;
//     this.consumerInFlightRequestsStore = new IDBKeyValueStore<
//       Omit<
//         InFlightRequest<T> & {
//           nonce: string;
//         },
//         "resolve" | "reject"
//       >
//     >(
//       `shared-service-consumer-requests-in-flight-ABC:${this.serviceName}`,
//       `shared-service-consumer-requests-in-flight-ABC:${this.serviceName}`
//     );
//     this.logger =
//       options.logger ??
//       createLogger(
//         `shared-service:${this.serviceName}`,
//         options.logLevel ?? "info"
//       );
//     this.readyResolve = null;
//     this.ready = new Promise((resolve) => {
//       this.readyResolve = resolve;
//     });

//     this._register();

//     // if querying of the lock returns false for two contexts, then only one will be capture the lock and the other will never be connected to the service
//     // so here we retry again shortly after the first attempt, to ensure that we account for race conditions when multiple contexts are trying to register at once
//     setTimeout(() => {
//       if (!this.isConsumer && !this.producerChannel) {
//         this.logger.info(
//           "Service did not register as a producer nor as a consumer, retrying..."
//         );
//         retry(async () => {
//           await this._register();
//           if (!this.isConsumer && !this.producerChannel) {
//             throw new Error(
//               "Service did not register as a producer nor as a consumer"
//             );
//           }
//         });
//       }
//     }, 200);
//   }

//   private async _register() {
//     const locks = await navigator.locks.query();
//     const sharedServiceLockExists = locks.held?.some(
//       (lock) => lock.name === `shared-service:${this.serviceName}`
//     );

//     if (sharedServiceLockExists) {
//       this.logger.info("Consumer exists, becoming producer...");
//       this._onBecomeProducer();
//     }
//     createInfinitelyOpenLock(`shared-service:${this.serviceName}`, async () => {
//       this.logger.info("Consumer does not exist, becoming consumer...");
//       await this._onBecomeConsumer();
//     });
//   }
// }

// //!!!!!!!!!!!!!!!!!!!!!!!!
// //!!!!!!!!!!!!!!!!!!!!!!!!
// //!!!!!!!!!!!!!!!!!!!!!!!!
// //!!!!!!!!!!!!!!!!!!!!!!!!
// //!!!!!!!!!!!!!!!!!!!!!!!!
// //!!!!!!!!!!!!!!!!!!!!!!!!
// //!!!!!!!!!!!!!!!!!!!!!!!!
// //!!!!!!!!!!!!!!!!!!!!!!!!

// class SharedServiceConsumer<T extends object> {
//   serviceProxy: SharedServiceProxy<T>;
//   private readonly serviceName: string;
//   private readonly sharedChannel: BroadcastChannel;
//   private readonly registeredProducers: Set<string>;
//   private readonly consumedRequestsInProcess: Set<string>;
//   private readonly consumerInFlightRequestsStore: KeyValueStore<
//     Omit<InFlightRequest<T>, "resolve" | "reject"> & {
//       nonce: string;
//     }
//   >;
//   private readonly logger: Logger;

//   constructor(options: SharedServiceOptions<T>) {
//     this.serviceName = options.serviceName;
//     this.serviceProxy = this._getServiceProxy(options.service);
//     this.sharedChannel = new BroadcastChannel(
//       `shared-service:${this.serviceName}`
//     );
//     this.registeredProducers = new Set();
//     this.consumerInFlightRequestsStore = new IDBKeyValueStore<
//       Omit<
//         InFlightRequest<T> & {
//           nonce: string;
//         },
//         "resolve" | "reject"
//       >
//     >(
//       `shared-service-consumer-requests-in-flight-ABC:${this.serviceName}`,
//       `shared-service-consumer-requests-in-flight-ABC:${this.serviceName}`
//     );
//     this.logger =
//       options.logger ??
//       createLogger(
//         `shared-service:${this.serviceName}`,
//         options.logLevel ?? "info"
//       );

//     this._init();
//   }

//   private async _init() {
//     // listen to newly registered consumers
//     this.sharedChannel.addEventListener(
//       "message",
//       async (event: MessageEvent<ProducerRegistrationEventData>) => {
//         const { type, payload } = event.data;
//         if (type !== "producer-registration") return;

//         const { producerId } = payload;

//         if (this.registeredProducers.has(producerId)) {
//           this.logger.error(
//             `Producer with id ${producerId} already registered`
//           );
//           return;
//         }

//         this.logger.info(
//           `Producer with id ${producerId} is registering, creating channel...`
//         );

//         const producerChannel = new BroadcastChannel(
//           `shared-service-producer:${this.serviceName}-${producerId}`
//         );
//         navigator.locks.request(
//           `shared-service-producer:${this.serviceName}-${producerId}`,
//           { mode: "exclusive" },
//           () => {
//             this.logger.info(
//               `Producer with id ${producerId} has disconnected, cleaning up`
//             );
//             this.registeredProducers.delete(producerId);
//             producerChannel.close();
//           }
//         );

//         producerChannel.addEventListener(
//           "message",
//           async (event: MessageEvent<ProducerChannelEventData<T>>) => {
//             if (event.data.type === "response") return;
//             const { nonce, method, args } = event.data.payload;

//             if (this.consumedRequestsInProcess.has(nonce)) {
//               this.logger.warn(
//                 `Request with nonce ${nonce} already in process, ignoring`
//               );
//               return;
//             }
//             this.consumedRequestsInProcess.add(nonce);

//             this.logger.info(
//               `Received request with nonce ${nonce} for method ${String(
//                 method
//               )} with args`,
//               args
//             );

//             let result: unknown = null;
//             let error: unknown = null;
//             try {
//               if (typeof this.serviceProxy[method] !== "function") {
//                 throw new Error(
//                   `Expected to receive a function, but received ${String(
//                     method
//                   )}`
//                 );
//               }
//               result = await this.serviceProxy[method](...args);
//             } catch (e) {
//               this.logger.error(
//                 `Error occurred while invoking method ${String(method)}: ${e}`
//               );
//               error = e;
//             } finally {
//               this.consumedRequestsInProcess.delete(nonce);
//             }

//             this.logger.debug(
//               `Sending response with nonce ${nonce} for method ${String(
//                 method
//               )} with result`,
//               result
//             );

//             producerChannel.postMessage({
//               type: "response",
//               payload: {
//                 nonce,
//                 result,
//                 error,
//               },
//             });
//           }
//         );

//         this.registeredProducers.add(producerId);

//         this.logger.info(`Producer with id ${producerId} registered`);

//         this.sharedChannel.postMessage({
//           type: "producer-registered",
//           payload: { producerId },
//         });
//       }
//     );

//     this.sharedChannel.postMessage({ type: "consumer-change" });

//     await this.onConsumerChange?.(this.isConsumer);

//     this.readyResolve?.();

//     const previousConsumerRequestsInFlightNonces = new Set();

//     const previousConsumerRequestsInFlight =
//       await this.consumerInFlightRequestsStore.getAll();

//     if (previousConsumerRequestsInFlight.length > 0) {
//       await Promise.allSettled(
//         previousConsumerRequestsInFlight.map(
//           async ({ nonce, method, args }) => {
//             previousConsumerRequestsInFlightNonces.add(nonce);
//             try {
//               const requestMethodValue = this.serviceProxy[method];
//               if (typeof requestMethodValue !== "function") {
//                 throw new Error(`Method ${String(method)} is not a function`);
//               }
//               await requestMethodValue(...args);
//               this.consumerInFlightRequestsStore.delete(nonce);
//             } catch (error) {
//               this.logger.error(
//                 `Error occurred while invoking method ${String(
//                   method
//                 )}: ${error}`
//               );
//             } finally {
//               this.consumerInFlightRequestsStore.delete(nonce);
//             }
//           }
//         )
//       );
//     }
//   }

//   private _getServiceProxy(service: T) {
//     return new Proxy(service, {
//       get: (target, property) => {
//         if (typeof property === "symbol") return undefined;

//         const typedProperty = property as keyof T;
//         const typedPropertyValue = target[typedProperty];

//         if (typeof typedPropertyValue !== "function") {
//           this.logger.debug(
//             `Property ${String(
//               property
//             )} is not a function, returning the property value`
//           );
//           return typedPropertyValue;
//         }

//         return async (...args: unknown[]) => {
//           this.logger.debug(
//             `Consumer invoking method ${String(property)} with args`,
//             args
//           );

//           const nonce = generateId();
//           await this.consumerInFlightRequestsStore.set(nonce, {
//             nonce,
//             method: typedProperty,
//             args,
//           });

//           const returnValue = await typedPropertyValue(...args);
//           this.consumerInFlightRequestsStore.delete(nonce);
//           return returnValue;
//         };
//       },
//     }) as SharedServiceProxy<T>;
//   }
// }

// //!!!!!!!!!!!!!!!!!!!!!!!!
// //!!!!!!!!!!!!!!!!!!!!!!!!
// //!!!!!!!!!!!!!!!!!!!!!!!!
// //!!!!!!!!!!!!!!!!!!!!!!!!
// //!!!!!!!!!!!!!!!!!!!!!!!!
// //!!!!!!!!!!!!!!!!!!!!!!!!
// //!!!!!!!!!!!!!!!!!!!!!!!!
// //!!!!!!!!!!!!!!!!!!!!!!!!

// class SharedServiceProducer<T extends object> {
//   serviceProxy: SharedServiceProxy<T>;
//   private readonly serviceName: string;
//   private readonly sharedChannel: BroadcastChannel;
//   private readonly producerChannel: BroadcastChannel;
//   private readonly onConsumerChange?: OnConsumerChange;
//   private readonly producedRequestsInFlight: Map<string, InFlightRequest<T>>;
//   private readonly logger: Logger;

//   constructor(options: SharedServiceOptions<T>) {
//     this.serviceName = options.serviceName;
//     this.serviceProxy = new Proxy(options.service, {
//       get: (target, property) => {
//         if (typeof property === "symbol") return undefined;

//         const typedProperty = property as keyof T;
//         const typedPropertyValue = target[typedProperty];

//         if (typeof typedPropertyValue !== "function") {
//           this.logger.debug(
//             `Property ${String(
//               property
//             )} is not a function, returning the property value`
//           );
//           return typedPropertyValue;
//         }

//         return async (...args: unknown[]) => {
//           this.logger.debug(
//             `Producer invoking method ${String(
//               property
//             )} with args, sending request to consumer`,
//             args
//           );

//           return new Promise((resolve, reject) => {
//             const nonce = generateId();
//             const responseListener = this._createResponseListener(
//               nonce,
//               resolve,
//               reject
//             );
//             this.producerChannel?.addEventListener("message", responseListener);
//             this.producerChannel?.postMessage({
//               type: "request",
//               payload: {
//                 nonce,
//                 method: property,
//                 args,
//               },
//             });
//             this.producedRequestsInFlight.set(nonce, {
//               method: typedProperty,
//               args,
//               resolve,
//               reject,
//             });
//           });
//         };
//       },
//     }) as SharedServiceProxy<T>;
//     this.sharedChannel = new BroadcastChannel(
//       `shared-service:${this.serviceName}`
//     );
//     this.producerChannel = null;
//     this.producedRequestsInFlight = new Map();
//     this.consumedRequestsInProcess = new Set();
//     this.registeredProducers = new Set();
//     this.onConsumerChange = options.onConsumerChange;
//     this.consumerInFlightRequestsStore = new IDBKeyValueStore<
//       Omit<
//         InFlightRequest<T> & {
//           nonce: string;
//         },
//         "resolve" | "reject"
//       >
//     >(
//       `shared-service-consumer-requests-in-flight-ABC:${this.serviceName}`,
//       `shared-service-consumer-requests-in-flight-ABC:${this.serviceName}`
//     );
//     this.logger =
//       options.logger ??
//       createLogger(
//         `shared-service:${this.serviceName}`,
//         options.logLevel ?? "info"
//       );
//     this.producerChannel = new BroadcastChannel(
//       `shared-service-producer:${this.serviceName}-${producerId}`
//     );

//     this._register();
//   }

//   private async _onBecomeProducer() {
//     const producerId = generateId();

//     const register = async () => {
//       await new Promise<void>((resolve) => {
//         const onRegisteredListener = (
//           event: MessageEvent<SharedChannelEventData>
//         ) => {
//           if (
//             event.data.type === "producer-registered" &&
//             event.data.payload.producerId === producerId
//           ) {
//             this.sharedChannel.removeEventListener(
//               "message",
//               onRegisteredListener
//             );
//             resolve();
//           }
//         };
//         this.sharedChannel.addEventListener("message", onRegisteredListener);
//         this.sharedChannel.postMessage({
//           type: "producer-registration",
//           payload: { producerId },
//         });
//       });
//       await this.onConsumerChange?.(this.isConsumer);
//       this.readyResolve?.();
//     };

//     this.sharedChannel.addEventListener(
//       "message",
//       async (event: MessageEvent<SharedChannelEventData>) => {
//         if (event.data.type === "consumer-change") {
//           await this.onConsumerChange?.(this.isConsumer);
//           await register();

//           if (this.producedRequestsInFlight.size > 0) {
//             for (const [nonce, { method, args, resolve, reject }] of this
//               .producedRequestsInFlight) {
//               const responseListener = this._createResponseListener(
//                 nonce,
//                 resolve,
//                 reject
//               );
//               this.producerChannel?.addEventListener(
//                 "message",
//                 responseListener
//               );
//               this.producerChannel?.postMessage({
//                 type: "request",
//                 payload: {
//                   nonce,
//                   method,
//                   args,
//                 },
//               });
//             }
//           }
//         }
//       }
//     );

//     // create a lock for the producer, so that when this lock is released, the consumer knows the provider is gone and can close the channel
//     createInfinitelyOpenLock(
//       `shared-service-producer:${this.serviceName}-${producerId}`,
//       register
//     );
//   }

//   private _createResponseListener(
//     nonce: string,
//     resolve: (value: unknown) => void,
//     reject: (reason?: unknown) => void
//   ) {
//     const listener = (event: MessageEvent<ProducerChannelEventData<T>>) => {
//       const { type, payload } = event.data;
//       if (type === "request" || payload.nonce !== nonce) return;

//       const { result, error } = payload;

//       if (error) {
//         reject(error);
//       } else {
//         resolve(result);
//       }

//       this.producedRequestsInFlight.delete(nonce);
//       this.producerChannel?.removeEventListener("message", listener);
//     };

//     return listener;
//   }
// }
