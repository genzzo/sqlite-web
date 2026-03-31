/// <reference lib="webworker" />

import { ManualPromise } from "./utils";

const sw = self as unknown as DedicatedWorkerGlobalScope;

let isLeader = false;
const ready = new ManualPromise<void>();

const lockName = `shared-worker-polyfill-lock`;

navigator.locks.request(
  lockName,
  { mode: "exclusive", ifAvailable: true },
  async (lock) => {
    isLeader = lock !== null;

    if (!isLeader) {
      navigator.locks.request(lockName, { mode: "exclusive" }, async () => {
        isLeader = true;
        sw.postMessage({ isLeader });
        await new Promise(() => {});
      });
    }

    ready.resolve();
    if (lock) await new Promise(() => {});
  },
);

sw.onmessage = async (event) => {
  await ready.promise;
  const port = event.ports[0];
  port.postMessage({ isLeader });
};
