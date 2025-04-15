/// <reference lib="webworker" />

import { OpfsSAHPoolDatabase } from "@sqlite.org/sqlite-wasm";
import { createSharedService } from "../split-shared-service";
import { defineWorkerApi } from "../utils";

const worker = self as unknown as DedicatedWorkerGlobalScope;

let db: OpfsSAHPoolDatabase | null =
  null as unknown as null | OpfsSAHPoolDatabase;

async function initDB() {
  const sqlite3InitModule = (await import("@sqlite.org/sqlite-wasm")).default;
  const sqlite3 = await sqlite3InitModule();
  const poolUtil = await sqlite3.installOpfsSAHPoolVfs({});
  db = new poolUtil.OpfsSAHPoolDb("app-db-v1.sqlite3");
}

type DBWrapper = {
  [K in keyof OpfsSAHPoolDatabase]: OpfsSAHPoolDatabase[K] extends Function
    ? OpfsSAHPoolDatabase[K]
    : () => OpfsSAHPoolDatabase[K];
};

const dbWrapper = {
  affirmOpen: (...args) => db?.affirmOpen.apply(db, args),
  changes: (...args) => db?.changes.apply(db, args),
  checkRc: (...args) => db?.checkRc.apply(db, args),
  close: (...args) => db?.close.apply(db, args),
  // @ts-expect-error multiple overloads
  createFunction: (...args) => db?.createFunction.apply(db, args),
  dbFilename: (...args) => db?.dbFilename.apply(db, args),
  dbName: (...args) => db?.dbName.apply(db, args),
  dbVfsName: (...args) => db?.dbVfsName.apply(db, args),
  // @ts-expect-error multiple overloads
  exec: (...args) => db?.exec.apply(db, args),
  filename: () => db?.filename,
  isOpen: (...args) => db?.isOpen.apply(db, args),
  onclose: () => db?.onclose,
  openStatementCount: (...args) => db?.openStatementCount.apply(db, args),
  pointer: () => db?.pointer,
  prepare: (...args) => db?.prepare.apply(db, args),
  savepoint: (...args) => db?.savepoint.apply(db, args),
  selectArray: (...args) => db?.selectArray.apply(db, args),
  selectArrays: (...args) => db?.selectArrays.apply(db, args),
  selectObject: (...args) => db?.selectObject.apply(db, args),
  // @ts-expect-error multiple overloads
  selectValue: (...args) => db?.selectValue.apply(db, args),
  selectValues: (...args) => db?.selectValues.apply(db, args),
  // @ts-expect-error multiple overloads
  transaction: (...args) => db?.transaction.apply(db, args),
} as DBWrapper;

const dbService = createSharedService({
  serviceName: "offline-db-sqlite",
  service: dbWrapper,
  onProviderElection: async (isProvider) => {
    if (isProvider) {
      await initDB();
    }
  },
});

defineWorkerApi(worker, dbService.serviceProxy);
