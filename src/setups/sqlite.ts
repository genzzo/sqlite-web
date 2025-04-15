import { createWorkerClient } from "../utils";

const worker = new Worker(new URL("./sqlite.worker.ts", import.meta.url), {
  type: "module",
});

const workerApi = createWorkerClient<{
  increment: () => void;
  decrement: () => void;
  getNumber: () => number;
  reset: () => void;
  setNumber: (value: number) => void;
}>(worker);
