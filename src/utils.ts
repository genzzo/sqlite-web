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

type ProxyClient<T> = {
  [K in keyof T]: T[K] extends Function
    ? // @ts-expect-error need to handle multiple overloads
      (...args: Parameters<T[K]>) => Promise<ReturnType<T[K]>>
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
