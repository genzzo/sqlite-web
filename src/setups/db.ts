import * as Sqlite from "@sqlite.org/sqlite-wasm";
import { createWorkerClient, ProxyClient } from "../utils";

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

const dbClient = createWorkerClient<Sqlite.OpfsSAHPoolDatabase>(
  sqliteWorker
) as OpfsSAHPoolDatabaseDbWorkerClientType;

async function executeQuery() {
  const sqlQuery = sqlQueryInput.value;
  try {
    const result = await dbClient.exec(sqlQuery, { returnValue: "resultRows" });
    queryResultDiv.innerText = result.join("\n");
  } catch (error) {
    queryResultDiv.innerText = `Error: ${error}`;
  }
  sqlQueryInput.value = "";
}

executeQueryButton.addEventListener("click", executeQuery);

/**
 * This is a type wrapper for the worker client as it cannot handle overloads. While we can handle the typescript overloads with a generic type, it has a huge hit on performance.
 */
type OpfsSAHPoolDatabaseDbWorkerClientType = Omit<
  ProxyClient<Sqlite.OpfsSAHPoolDatabase>,
  "exec"
> & {
  /**
   * Creates a new scalar, aggregate, or window function which is accessible via
   * SQL code.
   *
   * When called from SQL, arguments to the UDF, and its result, will be
   * converted between JS and SQL with as much fidelity as is feasible,
   * triggering an exception if a type conversion cannot be determined. Some
   * freedom is afforded to numeric conversions due to friction between the JS
   * and C worlds: integers which are larger than 32 bits will be treated as
   * doubles or `BigInt` values.
   *
   * UDFs cannot currently be removed from a DB handle after they're added. More
   * correctly, they can be removed as documented for
   * `sqlite3_create_function_v2()`, but doing so will "leak" the JS-created
   * WASM binding of those functions.
   *
   * The first two call forms can only be used for creating scalar functions.
   * Creating an aggregate or window function requires the options-object form,
   * as described below.
   */
  createFunction(
    name: string,
    func: (ctxPtr: number, ...values: Sqlite.SqlValue[]) => Sqlite.SqlValue
  ): Promise<Sqlite.OpfsSAHPoolDatabase>;
  createFunction(
    name: string,
    func: (ctxPtr: number, ...values: Sqlite.SqlValue[]) => void,
    options: Sqlite.FunctionOptions
  ): Promise<Sqlite.OpfsSAHPoolDatabase>;
  createFunction(
    name: string,
    options:
      | Sqlite.ScalarFunctionOptions
      | Sqlite.AggregateFunctionOptions
      | Sqlite.WindowFunctionOptions
  ): Promise<Sqlite.OpfsSAHPoolDatabase>;
  createFunction(
    options: (
      | Sqlite.ScalarFunctionOptions
      | Sqlite.AggregateFunctionOptions
      | Sqlite.WindowFunctionOptions
    ) & { name: string }
  ): Promise<Sqlite.OpfsSAHPoolDatabase>;
  /**
   * Executes SQL statements and optionally collects query results and/or calls
   * a callback for each result row.
   *
   * _LOTS_ of overloads on this one one, depending on:
   *
   * - `sql` as parameter or as option
   * - `returnValue`:
   *
   *   - `"this"`: default, return database instance, use for fluent calls
   *   - `"resultRows"`: return values of `resultRows` array (set to empty array if
   *       not set by user)
   *   - `"saveSql"`: return values of `saveSql` option (set to empty array if not
   *       set by user)
   * - `resultRows`:
   *
   *   - `"array"`: Array of column values for every result row
   *   - `"object"`: Object mapping column names to values for every result row
   *   - `"stmt"`: Only for use with `callback` option, pass
   *       {@link PreparedStatement} object for every row.
   *   - `number`: Extract column with (zero-based) index from every result row
   *   - `string`: Extract column with name from every result row, must have format
   *       `$<column>`, with `column` having at least two characters.
   *
   * ⚠️**ACHTUNG**⚠️: The combination of `returnValue: "resultRows"` and
   * `rowMode: "stmt"` type checks fine, but will lead to a runtime error. This
   * is due to a limitation in TypeScript's type system which does not allow
   * restrictions on `string` types.
   */
  exec(
    sql: Sqlite.FlexibleString,
    opts?: (Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeArrayOptions &
      Sqlite.ExecReturnThisOptions) & {
      sql?: undefined;
    }
  ): Promise<Sqlite.OpfsSAHPoolDatabase>;
  exec(
    opts: (Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeArrayOptions &
      Sqlite.ExecReturnThisOptions) & { sql: Sqlite.FlexibleString }
  ): Promise<Sqlite.OpfsSAHPoolDatabase>;
  exec(
    sql: Sqlite.FlexibleString,
    opts: Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeObjectOptions &
      Sqlite.ExecReturnThisOptions & {
        sql?: undefined;
      }
  ): Promise<Sqlite.OpfsSAHPoolDatabase>;
  exec(
    opts: Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeObjectOptions &
      Sqlite.ExecReturnThisOptions & {
        sql: Sqlite.FlexibleString;
      }
  ): Promise<Sqlite.OpfsSAHPoolDatabase>;
  exec(
    sql: Sqlite.FlexibleString,
    opts: Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeStmtOptions &
      Sqlite.ExecReturnThisOptions & {
        sql?: undefined;
      }
  ): Promise<Sqlite.OpfsSAHPoolDatabase>;
  exec(
    opts: Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeStmtOptions &
      Sqlite.ExecReturnThisOptions & {
        sql: Sqlite.FlexibleString;
      }
  ): Promise<Sqlite.OpfsSAHPoolDatabase>;
  exec(
    sql: Sqlite.FlexibleString,
    opts: Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeScalarOptions &
      Sqlite.ExecReturnThisOptions & {
        sql?: undefined;
      }
  ): Promise<Sqlite.OpfsSAHPoolDatabase>;
  exec(
    opts: Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeScalarOptions &
      Sqlite.ExecReturnThisOptions & {
        sql: Sqlite.FlexibleString;
      }
  ): Promise<Sqlite.OpfsSAHPoolDatabase>;
  exec(
    sql: Sqlite.FlexibleString,
    opts: Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeArrayOptions &
      Sqlite.ExecReturnResultRowsOptions & {
        sql?: undefined;
      }
  ): Promise<Sqlite.SqlValue[][]>;
  exec(
    opts: Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeArrayOptions &
      Sqlite.ExecReturnResultRowsOptions & {
        sql: Sqlite.FlexibleString;
      }
  ): Promise<Sqlite.SqlValue[][]>;
  exec(
    sql: Sqlite.FlexibleString,
    opts: Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeObjectOptions &
      Sqlite.ExecReturnResultRowsOptions & {
        sql?: undefined;
      }
  ): Promise<{ [columnName: string]: Sqlite.SqlValue }[]>;
  exec(
    opts: Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeObjectOptions &
      Sqlite.ExecReturnResultRowsOptions & {
        sql: Sqlite.FlexibleString;
      }
  ): Promise<{ [columnName: string]: Sqlite.SqlValue }[]>;
  exec(
    sql: Sqlite.FlexibleString,
    opts: Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeScalarOptions &
      Sqlite.ExecReturnResultRowsOptions & {
        sql?: undefined;
      }
  ): Promise<Sqlite.SqlValue[]>;
  exec(
    opts: Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeScalarOptions &
      Sqlite.ExecReturnResultRowsOptions & {
        sql: Sqlite.FlexibleString;
      }
  ): Promise<Sqlite.SqlValue[]>;
  exec(
    sql: Sqlite.FlexibleString,
    opts: Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeArrayOptions &
      Sqlite.ExecReturnSaveSqlOptions & {
        sql?: undefined;
      }
  ): Promise<string[]>;
  exec(
    opts: Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeArrayOptions &
      Sqlite.ExecReturnSaveSqlOptions & {
        sql: Sqlite.FlexibleString;
      }
  ): Promise<string[]>;
  exec(
    sql: Sqlite.FlexibleString,
    opts: Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeObjectOptions &
      Sqlite.ExecReturnSaveSqlOptions & {
        sql?: undefined;
      }
  ): Promise<string[]>;
  exec(
    opts: Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeObjectOptions &
      Sqlite.ExecReturnSaveSqlOptions & {
        sql: Sqlite.FlexibleString;
      }
  ): Promise<string[]>;
  exec(
    sql: Sqlite.FlexibleString,
    opts: Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeStmtOptions &
      Sqlite.ExecReturnSaveSqlOptions & {
        sql?: undefined;
      }
  ): Promise<string[]>;
  exec(
    opts: Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeStmtOptions &
      Sqlite.ExecReturnSaveSqlOptions & {
        sql: Sqlite.FlexibleString;
      }
  ): Promise<string[]>;
  exec(
    sql: Sqlite.FlexibleString,
    opts: Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeScalarOptions &
      Sqlite.ExecReturnSaveSqlOptions & {
        sql?: undefined;
      }
  ): Promise<string[]>;
  exec(
    opts: Sqlite.ExecBaseOptions &
      Sqlite.ExecRowModeScalarOptions &
      Sqlite.ExecReturnSaveSqlOptions & {
        sql: Sqlite.FlexibleString;
      }
  ): Promise<string[]>;
  /**
   * Prepares the given SQL, `step()`s the resulting {@link PreparedStatement}
   * one time, and returns the value of the first result column. If it has no
   * results, `undefined` is returned. If passed a second argument, it is
   * treated like an argument to {@link PreparedStatement#bind}, so may be any
   * type supported by that function. Passing the `undefined` value is the same
   * as passing no value, which is useful when... If passed a 3rd argument, it
   * is expected to be one of the `SQLITE_{typename}` constants. Passing the
   * `undefined` value is the same as not passing a value. Throws on error (e.g.
   * malformed SQL).
   */
  selectValue(
    sql: Sqlite.FlexibleString,
    bind: Sqlite.BindingSpec | undefined,
    asType: Sqlite.CAPI["SQLITE_INTEGER"] | Sqlite.CAPI["SQLITE_FLOAT"]
  ): Promise<number | undefined>;
  selectValue(
    sql: Sqlite.FlexibleString,
    bind: Sqlite.BindingSpec | undefined,
    asType: Sqlite.CAPI["SQLITE_TEXT"]
  ): Promise<string | undefined>;
  selectValue(
    sql: Sqlite.FlexibleString,
    bind: Sqlite.BindingSpec | undefined,
    asType: Sqlite.CAPI["SQLITE_BLOB"]
  ): Promise<Uint8Array | undefined>;
  selectValue(
    sql: Sqlite.FlexibleString,
    bind: Sqlite.BindingSpec | undefined,
    asType: Sqlite.CAPI["SQLITE_NULL"]
  ): Promise<null | undefined>;
  selectValue(
    sql: Sqlite.FlexibleString,
    bind?: Sqlite.BindingSpec
  ): Promise<Sqlite.SqlValue | undefined>;
  /**
   * Starts a transaction, calls the given `callback`, and then either rolls
   * back or commits the transaction, depending on whether the `callback`
   * throws. The `callback` is passed this object as its only argument. On
   * success, returns the result of the callback. Throws on error.
   *
   * Note that transactions may not be nested, so this will throw if it is
   * called recursively. For nested transactions, use the
   * {@link Database#savepoint} method or manually manage `SAVEPOINT`s using
   * {@link Database#exec}.
   *
   * If called with 2 arguments, the first must be a keyword which is legal
   * immediately after a `BEGIN` statement, e.g. one of `"DEFERRED"`,
   * `"IMMEDIATE"`, or `"EXCLUSIVE"`. Though the exact list of supported
   * keywords is not hard-coded here, in order to be future-compatible, if the
   * argument does not look like a single keyword then an exception is triggered
   * with a description of the problem.
   */
  transaction<T>(callback: (db: Sqlite.OpfsSAHPoolDatabase) => T): Promise<T>;
  transaction<T>(
    beginQualifier: "DEFERRED" | "IMMEDIATE" | "EXCLUSIVE",
    callback: (db: Sqlite.OpfsSAHPoolDatabase) => T
  ): Promise<T>;
};
