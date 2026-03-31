const dedicatedWorker = self as unknown as DedicatedWorkerGlobalScope;
const sharedWorker = self as unknown as SharedWorkerGlobalScope;

// Dedicated Worker events: error, languagechange, message, messageerror, offline, online, rejectionhandled, rtctransform, unhandledrejection

// Shared Worker events: connect, error, languagechange, offline, online, rejectionhandled, unhandledrejection

dedicatedWorker.addEventListener("ver", (event) => {});

sharedWorker.addEventListener("connect", (event) => {
  const port = event.ports[0];
  port.addEventListener("message", (event) => {
    port.postMessage(`Echo: ${event.data}`);
  });
  port.start();
});
