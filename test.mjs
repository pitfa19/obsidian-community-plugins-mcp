#!/usr/bin/env node
// Smoke test: starts the server over stdio and calls every tool against live data.
// Usage: npm test
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const server = spawn(process.execPath, [fileURLToPath(new URL("./server.mjs", import.meta.url))], {
  stdio: ["pipe", "pipe", "inherit"],
});

const pending = new Map();
let buf = "";
server.stdout.on("data", (chunk) => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl);
    buf = buf.slice(nl + 1);
    if (!line.trim()) continue;
    const msg = JSON.parse(line);
    pending.get(msg.id)?.(msg);
  }
});

let nextId = 1;
function rpc(method, params) {
  const id = nextId++;
  server.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${method} timed out`)), 60000);
    pending.set(id, (msg) => {
      clearTimeout(t);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    });
  });
}
const call = (name, args) => rpc("tools/call", { name, arguments: args }).then((r) => JSON.parse(r.content[0].text));

let failed = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failed++;
}

try {
  await rpc("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "0" } });
  server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

  const tools = (await rpc("tools/list", {})).tools.map((t) => t.name).sort();
  check("tools/list exposes 4 tools", tools.join() === "get_plugin,search_plugins,search_themes,top_plugins", tools.join());

  const t0 = Date.now();
  const [plugins, themes] = await Promise.all([
    call("search_plugins", { query: "kanban", limit: 3 }),
    call("search_themes", { query: "minimal", limit: 3, mode: "dark" }),
  ]);
  check("parallel cold calls succeed", true, `${Date.now() - t0} ms`);
  check("search_plugins finds Kanban", plugins.results.some((p) => p.id === "obsidian-kanban"));
  check("search_plugins reports total beyond limit", plugins.total_matches >= plugins.shown && plugins.shown === plugins.results.length, `${plugins.total_matches} total, ${plugins.shown} shown`);
  check("search_plugins sorted by downloads", plugins.results.every((p, i, a) => i === 0 || a[i - 1].downloads >= p.downloads));
  check("search_plugins reports latest version", plugins.results.every((p) => typeof p.latest === "string"), plugins.results[0]?.latest);
  check("search_themes respects mode filter", themes.results.every((t) => t.modes.includes("dark")));

  const dv = await call("get_plugin", { id: "dataview" });
  check("get_plugin returns dataview", dv.id === "dataview" && dv.downloads > 1_000_000, `${dv.downloads} downloads, v${dv.latest}`);

  const top = await call("top_plugins", { limit: 5 });
  check("top_plugins returns 5 sorted results", top.length === 5 && top[0].downloads >= top[4].downloads, top[0].name);

  const t1 = Date.now();
  const pomo = await call("search_plugins", { query: "pomodoro", limit: 3 });
  check("warm call is fast", Date.now() - t1 < 1000, `${Date.now() - t1} ms`);
  check("total_matches counts all, not just shown", pomo.total_matches > 3 && pomo.shown === 3, `${pomo.total_matches} pomodoro plugins`);

  const missing = await rpc("tools/call", { name: "get_plugin", arguments: { id: "no-such-plugin-xyz" } });
  check("unknown plugin returns isError", missing.isError === true);
} catch (err) {
  check("test run", false, err.message);
} finally {
  server.kill();
}

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
