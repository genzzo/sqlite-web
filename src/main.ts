import "./style.css";

const worker = new Worker(new URL("./shared-worker-poly.ts", import.meta.url), {
  type: "module",
});

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
<section id="center">
  <h1 id="status">Checking...</h1>
</section>
`;

const { port1, port2 } = new MessageChannel();

port1.onmessage = (e) => {
  const { isLeader } = e.data;
  document.querySelector<HTMLHeadingElement>("#status")!.textContent = isLeader
    ? "Leader"
    : "Not Leader";
};

worker.onmessage = (e) => {
  const { isLeader } = e.data;
  document.querySelector<HTMLHeadingElement>("#status")!.textContent = isLeader
    ? "Leader"
    : "Not Leader";
};

worker.postMessage("check", [port2]);
