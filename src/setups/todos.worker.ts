/// <reference lib="webworker" />

import { OpfsSAHPoolDatabase } from "@sqlite.org/sqlite-wasm";
import { createSharedService } from "../split-shared-service";
import { defineWorkerApi } from "../utils";

const worker = self as unknown as DedicatedWorkerGlobalScope;

let db: OpfsSAHPoolDatabase | null = null;

async function initDB() {
  const sqlite3InitModule = (await import("@sqlite.org/sqlite-wasm")).default;
  const sqlite3 = await sqlite3InitModule();
  const poolUtil = await sqlite3.installOpfsSAHPoolVfs({});
  db = new poolUtil.OpfsSAHPoolDb("app-db-v1.sqlite3");

  db.exec(
    "CREATE TABLE IF NOT EXISTS Todos (id INTEGER PRIMARY KEY, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, content TEXT, done INTEGER DEFAULT 0)"
  );
}

const service = {
  addTodo: async (todo: string) => {
    db?.exec(`INSERT INTO Todos (content) VALUES ('${todo}')`);
  },
  getTodos: async () => {
    const rows = db?.exec("SELECT * FROM Todos ORDER BY id DESC LIMIT 10", {
      returnValue: "resultRows",
    });
    console.log(rows);
    return rows;
  },
};

const dbService = createSharedService({
  serviceName: "offline-db-sqlite",
  service,
  onProviderElection: async (isProvider) => {
    if (isProvider) {
      await initDB();
    }
  },
});

defineWorkerApi(worker, dbService.serviceProxy);
