import "./style.css";
import typescriptLogo from "./typescript.svg";
import viteLogo from "/vite.svg";
import { setupCounter } from "./counter.ts";
import { createSharedService } from "./shared-service.ts";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Vite + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <div class="service-actions">
      <button id="service-add" type="button">Add</button>
      <button id="service-subtract" type="button">Subtract</button>
      <button id="service-multiply" type="button">Multiply</button>
      <button id="service-divide" type="button">Divide</button>
      <button id="service-slowAdd" type="button">Slow Add</button>
      <button id="service-slowSubtract" type="button">Slow Subtract</button>
      <button id="service-slowMultiply" type="button">Slow Multiply</button>
      <button id="service-slowDivide" type="button">Slow Divide</button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
  </div>
`;

const randomInt = () => Math.floor(Math.random() * 1000);
const operation = (a: number, b: number, op: "+" | "-" | "*" | "/") => {
  console.log(`Evaluating ${a} ${op} ${b}`);
  const result = eval(`${a} ${op} ${b}`) as number;
  console.log(`Evaluated ${a} ${op} ${b} = ${result}`);
  return result;
};

const slowOperation = async (
  a: number,
  b: number,
  op: "+" | "-" | "*" | "/"
) => {
  console.log(`Evaluating ${a} ${op} ${b} slowly`);
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const result = eval(`${a} ${op} ${b}`) as number;
  console.log(`Evaluated ${a} ${op} ${b} = ${result}`);
  return result;
};

const mockService = {
  staticField: "static",
  add(a: number, b: number) {
    return operation(a, b, "+");
  },
  subtract(a: number, b: number) {
    return operation(a, b, "-");
  },
  multiply(a: number, b: number) {
    return operation(a, b, "*");
  },
  divide(a: number, b: number) {
    return operation(a, b, "/");
  },
  async slowAdd(a: number, b: number) {
    return slowOperation(a, b, "+");
  },
  async slowSubtract(a: number, b: number) {
    return slowOperation(a, b, "-");
  },
  async slowMultiply(a: number, b: number) {
    return slowOperation(a, b, "*");
  },
  async slowDivide(a: number, b: number) {
    return slowOperation(a, b, "/");
  },
  random() {
    return randomInt();
  },
};

const s = createSharedService({
  serviceName: "counter",
  service: mockService,
  async onConsumerChange(isConsumer) {
    await new Promise((r) => setTimeout(r, randomInt() * 5));
    console.log("Consumer change", isConsumer);
  },
});

s.add(randomInt(), randomInt());
// s.service.subtract(randomInt(), randomInt());
// s.service.multiply(randomInt(), randomInt());

(
  [
    "add",
    "subtract",
    "multiply",
    "divide",
    "slowAdd",
    "slowSubtract",
    "slowMultiply",
    "slowDivide",
  ] as const
).forEach((method) => {
  document
    .querySelector<HTMLButtonElement>(`#service-${method}`)!
    .addEventListener("click", () => {
      s[method](randomInt(), randomInt());
    });
});

setupCounter(document.querySelector<HTMLButtonElement>("#counter")!);
