import type { OpfsSAHPoolDatabase } from "@sqlite.org/sqlite-wasm";
import { createWorkerClient } from "../utils";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <h1>Sqlite Test</h1>

    <div>
      <textarea id="sql-query" rows="4" cols="50" placeholder="Enter SQL query here..."></textarea>
      <button id="execute-query" type="button">Execute</button>
      <div id="query-result"></div>
    </div>
  </div>
`;

const executeQueryButton =
  document.querySelector<HTMLButtonElement>("#execute-query")!;
const sqlQueryInput =
  document.querySelector<HTMLTextAreaElement>("#sql-query")!;
const queryResultDiv = document.querySelector<HTMLDivElement>("#query-result")!;

const sqliteWorker = new Worker(new URL("./db.worker.ts", import.meta.url), {
  type: "module",
});

const dbClient = createWorkerClient<OpfsSAHPoolDatabase>(sqliteWorker);

async function executeQuery() {
  const sqlQuery = sqlQueryInput.value;
  try {
    // @ts-expect-error overload signature
    const result = await dbClient.exec(sqlQuery, { returnValue: "resultRows" });
    queryResultDiv.innerText = result.join("\n");
  } catch (error) {
    queryResultDiv.innerText = `Error: ${error}`;
  }
  sqlQueryInput.value = "";
}

executeQueryButton.addEventListener("click", executeQuery);
