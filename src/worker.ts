/// <reference lib="webworker" />

import { defineWorkerApi } from "./utils";

const worker = self as unknown as DedicatedWorkerGlobalScope;

let number = 0;

function increment() {
  number++;
}

function decrement() {
  number--;
}

function getNumber() {
  return number;
}

function reset() {
  number = 0;
}

function setNumber(value: number) {
  number = value;
}

defineWorkerApi(worker, {
  increment,
  decrement,
  getNumber,
  reset,
  setNumber,
});
