/// <reference lib="webworker" />

export function isBrowserContext() {
  return (
    typeof window !== "undefined" ||
    self instanceof WorkerGlobalScope ||
    self instanceof DedicatedWorkerGlobalScope ||
    self instanceof SharedWorkerGlobalScope ||
    self instanceof ServiceWorkerGlobalScope
  );
}
