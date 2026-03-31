import "./shim";

// export class SharedWorkerPolyfill {
//   constructor(
//     scriptURL: string | URL,
//     options?: string | WorkerOptions | undefined,
//   ) {
//     this.port = new MessagePort();
//   }

//   port: MessagePort;
//   addEventListener<K extends keyof AbstractWorkerEventMap>(
//     type: K,
//     listener: (this: SharedWorker, ev: AbstractWorkerEventMap[K]) => any,
//     options?: boolean | AddEventListenerOptions,
//   ): void;
//   addEventListener(
//     type: string,
//     listener: EventListenerOrEventListenerObject,
//     options?: boolean | AddEventListenerOptions,
//   ): void;
//   removeEventListener<K extends keyof AbstractWorkerEventMap>(
//     type: K,
//     listener: (this: SharedWorker, ev: AbstractWorkerEventMap[K]) => any,
//     options?: boolean | EventListenerOptions,
//   ): void;
//   removeEventListener(
//     type: string,
//     listener: EventListenerOrEventListenerObject,
//     options?: boolean | EventListenerOptions,
//   ): void;
//   dispatchEvent(event: Event): boolean;
//   onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null;
// }
