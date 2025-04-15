import { createWorkerClient } from "../utils";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <h1>Todos Sqlite Test</h1>

    <table id="todos-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Created At</th>
          <th>Updated At</th>
          <th>Content</th>
          <th>Done</th>
        </tr>
      </thead>
      <tbody id="todos-body">
        <tr>
          <td colspan="5">No todos found</td>
        </tr>
      </tbody>
    </table>

    <div>
      <button id="get-todos" type="button">Get Todos</button>
      <button id="add-todo" type="button">Add</button>
    </div>
  </div>
`;

const todoWorker = new Worker(new URL("./todos.worker.ts", import.meta.url), {
  type: "module",
});

const todoWorkerApi = createWorkerClient<{
  addTodo: (todo: string) => Promise<void>;
  getTodos: () => Promise<any>;
}>(todoWorker);

const todosTableBody =
  document.querySelector<HTMLTableSectionElement>("#todos-body")!;

const renderTodos = (todos: any[][]) => {
  todosTableBody.innerHTML = ""; // Clear the table body

  if (todos.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = "<td colspan='5'>No todos found</td>";
    todosTableBody.appendChild(emptyRow);
    return;
  }

  todos.forEach((todo) => {
    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${todo[0]}</td>
        <td>${todo[1]}</td>
        <td>${todo[2]}</td>
        <td>${todo[3]}</td>
        <td>${todo[3] ? "Yes" : "No"}</td>
      `;
    todosTableBody.appendChild(row);
  });
};

const getTodosButton = document.querySelector<HTMLButtonElement>("#get-todos")!;
const addTodoButton = document.querySelector<HTMLButtonElement>("#add-todo")!;

getTodosButton.addEventListener("click", async () => {
  const todos = await todoWorkerApi.getTodos();
  renderTodos(todos);
});

addTodoButton.addEventListener("click", async () => {
  await todoWorkerApi.addTodo(`Test Todo ${Math.random()}`);
});
