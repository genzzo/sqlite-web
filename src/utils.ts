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

export function defineWorkerApi<
  T extends Record<
    string,
    ((...args: any[]) => any) | ((...args: any[]) => Promise<any>)
  >
>(worker: DedicatedWorkerGlobalScope, api: T) {
  type MessageEventData = {
    method: keyof T;
    args?: unknown[];
  };

  const apiMethods = Object.keys(api) as (keyof T)[];
  const nonFunctionMethods = apiMethods.filter(
    (method) => typeof api[method] !== "function"
  );

  if (nonFunctionMethods.length > 0) {
    throw new Error(
      `All API methods must be functions. Invalid methods: ${nonFunctionMethods.join(
        ", "
      )}`
    );
  }

  worker.addEventListener("message", async (e: MessageEvent<unknown>) => {
    const data = e.data;
    if (typeof data !== "object" || !data || !("method" in data))
      throw new Error("Invalid message data");

    if (!apiMethods.includes(data.method as keyof T)) {
      throw new Error(`Unknown method: ${data.method}`);
    }

    if ("args" in data && !Array.isArray(data.args)) {
      throw new Error(
        `Invalid args. Expected an optional array, received ${typeof data.args}`
      );
    }

    const { method, args = [] } = data as MessageEventData;

    let result: unknown;
    let error: unknown;
    try {
      const methodFunction = api[method as keyof T];
      result = await methodFunction(...args);
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

export function createWorkerClient<
  T extends Record<string, (...args: any[]) => any>
>(
  worker: Worker
): {
  [K in keyof T]: (...args: Parameters<T[K]>) => Promise<ReturnType<T[K]>>;
} {
  const proxyHandler: ProxyHandler<T> = {
    get: (_target, method: string) => {
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
              method,
              args,
            },
            [channel.port2]
          );
        });
      };
    },
  };

  return new Proxy({} as T, proxyHandler);
}
