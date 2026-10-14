// Command-line interface over the shared search functions.
// Built for coding agents: compact text by default, --json for exact data.
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { getPlugin, searchPlugins, searchThemes, topPlugins, useDiskCache } from "./lib.mjs";
import { VERSION } from "./version.mjs";

const HELP = `obsidian-community-plugins ${VERSION}
Search the official Obsidian plugin and theme directory (8,900+ plugins).

Usage:
  npx -y github:pitfa19/obsidian-community-plugins-mcp <command> [options]

Commands:
  search <keywords>    Plugins matching all keywords, most downloaded first
  info <plugin-id>     One plugin: downloads, latest version, last update, releases
  top [keywords]       Most downloaded plugins, optionally filtered
  themes [keywords]    Themes matching all keywords
  mcp                  Start the MCP server (same as no command)

Options:
  --limit N            Max results (default 10)
  --mode dark|light    Themes only: filter by color mode
  --json               Print JSON instead of text
  --help, --version

Data is cached for 10 minutes in ~/.cache/obsidian-community-plugins.`;

function parse(argv) {
  const opts = { limit: 10, json: false, mode: "any", words: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--limit") opts.limit = Number(argv[++i]);
    else if (a.startsWith("--limit=")) opts.limit = Number(a.slice(8));
    else if (a === "--mode") opts.mode = argv[++i];
    else if (a.startsWith("--mode=")) opts.mode = a.slice(7);
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--version" || a === "-v") opts.version = true;
    else if (a.startsWith("--")) throw new Error(`Unknown option ${a}`);
    else opts.words.push(a);
  }
  if (!Number.isInteger(opts.limit) || opts.limit < 1 || opts.limit > 100) {
    throw new Error("--limit must be a whole number from 1 to 100");
  }
  if (!["any", "dark", "light"].includes(opts.mode)) throw new Error("--mode must be dark or light");
  return opts;
}

const num = (n) => n.toLocaleString("en-US");

function pluginLine(p) {
  return `${p.name} (${p.id}) | ${num(p.downloads)} downloads | v${p.latest ?? "?"} | updated ${p.updated ?? "?"}\n    ${p.description}\n    ${p.repo}`;
}

function cacheDir() {
  const base = process.env.XDG_CACHE_HOME || join(homedir() || tmpdir(), ".cache");
  return join(base, "obsidian-community-plugins");
}

export async function runCli(argv) {
  const [command, ...rest] = argv;
  let opts;
  try {
    opts = parse(rest);
  } catch (err) {
    console.error(`${err.message}\n\nRun with --help for usage.`);
    return 2;
  }
  if (command === "--help" || command === "-h" || command === "help" || opts.help) {
    console.log(HELP);
    return 0;
  }
  if (command === "--version" || command === "-v" || opts.version) {
    console.log(VERSION);
    return 0;
  }

  useDiskCache(cacheDir());
  const query = opts.words.join(" ");
  const out = (value, text) => console.log(opts.json ? JSON.stringify(value, null, 2) : text);

  try {
    switch (command) {
      case "search": {
        if (!query) throw new Error("search needs keywords, for example: search pomodoro");
        const r = await searchPlugins({ query, limit: opts.limit });
        const head = `${r.total_matches} plugins match "${query}"${r.total_matches > r.shown ? ` (top ${r.shown} by downloads)` : ""}`;
        out(r, [head, "", ...r.results.map(pluginLine)].join("\n"));
        return 0;
      }
      case "info": {
        if (opts.words.length !== 1) throw new Error("info needs exactly one plugin id, for example: info dataview");
        const p = await getPlugin({ id: opts.words[0] });
        if (!p) {
          console.error(`No plugin with id '${opts.words[0]}'. Use "search" to find the id.`);
          return 1;
        }
        out(p, `${pluginLine(p)}\n    ${p.versions_released} releases, author ${p.author}`);
        return 0;
      }
      case "top": {
        const r = await topPlugins({ query, limit: opts.limit });
        out(r, r.map((p, i) => `${i + 1}. ${pluginLine(p)}`).join("\n"));
        return 0;
      }
      case "themes": {
        const r = await searchThemes({ query, limit: opts.limit, mode: opts.mode });
        const lines = r.results.map((t) => `${t.name} by ${t.author} | ${t.modes.join("/") || "?"}${t.legacy ? " | legacy" : ""}\n    ${t.repo}`);
        out(r, [`${r.total_matches} themes match${query ? ` "${query}"` : ""}`, "", ...lines].join("\n"));
        return 0;
      }
      default:
        console.error(`Unknown command "${command}".\n\n${HELP}`);
        return 2;
    }
  } catch (err) {
    console.error(err.message);
    return err.message.startsWith("Could not download") ? 3 : 2;
  }
}
