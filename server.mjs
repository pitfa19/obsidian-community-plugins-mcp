#!/usr/bin/env node
// obsidian-community-plugins-mcp
// MCP server for searching the official Obsidian community plugin & theme directory.
// Data source: obsidianmd/obsidian-releases JSON indexes + plugin download stats.
// https://github.com/pitfa19/obsidian-community-plugins-mcp
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = "https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master";
const URLS = {
  plugins: `${BASE}/community-plugins.json`,
  themes: `${BASE}/community-css-themes.json`,
  stats: `${BASE}/community-plugin-stats.json`,
};

const cache = new Map(); // key -> { at, data }
const TTL_MS = 10 * 60 * 1000;

async function fetchJson(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const res = await fetch(URLS[key]);
  if (!res.ok) throw new Error(`Fetch ${key} failed: HTTP ${res.status}`);
  const data = await res.json();
  cache.set(key, { at: Date.now(), data });
  return data;
}

function matches(text, terms) {
  const hay = text.toLowerCase();
  return terms.every((t) => hay.includes(t));
}

function toTerms(query) {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

const server = new McpServer({ name: "obsidian-community-plugins", version: "1.0.0" });

server.registerTool(
  "search_plugins",
  {
    title: "Search Obsidian community plugins",
    description:
      "Search the official Obsidian community plugin directory (~9000 plugins) by keyword over name, id, author, and description. Returns matches with download counts, sorted by downloads.",
    inputSchema: {
      query: z.string().describe("Keywords, all must match (case-insensitive)"),
      limit: z.number().int().min(1).max(100).default(20).describe("Max results"),
    },
  },
  async ({ query, limit }) => {
    const [plugins, stats] = await Promise.all([fetchJson("plugins"), fetchJson("stats")]);
    const terms = toTerms(query);
    const out = plugins
      .filter((p) => matches(`${p.name} ${p.id} ${p.author} ${p.description}`, terms))
      .map((p) => ({
        id: p.id,
        name: p.name,
        author: p.author,
        description: p.description,
        repo: `https://github.com/${p.repo}`,
        downloads: stats[p.id]?.downloads ?? 0,
        latest: stats[p.id]?.latest ?? null,
        updated: stats[p.id]?.updated ? new Date(stats[p.id].updated).toISOString().slice(0, 10) : null,
      }))
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
    return {
      content: [{ type: "text", text: JSON.stringify({ total_matches_shown: out.length, results: out }, null, 2) }],
    };
  }
);

server.registerTool(
  "search_themes",
  {
    title: "Search Obsidian community themes",
    description:
      "Search the official Obsidian community theme directory (~900 themes) by keyword over name and author. Returns repo links, supported modes (dark/light), and screenshot URLs.",
    inputSchema: {
      query: z.string().describe("Keywords, all must match (case-insensitive). Empty-ish terms match all."),
      limit: z.number().int().min(1).max(100).default(20).describe("Max results"),
      mode: z.enum(["dark", "light", "any"]).default("any").describe("Filter by supported color mode"),
    },
  },
  async ({ query, limit, mode }) => {
    const themes = await fetchJson("themes");
    const terms = toTerms(query);
    const out = themes
      .filter((t) => matches(`${t.name} ${t.author}`, terms))
      .filter((t) => mode === "any" || (t.modes || []).includes(mode))
      .map((t) => ({
        name: t.name,
        author: t.author,
        repo: `https://github.com/${t.repo}`,
        modes: t.modes || [],
        screenshot: `https://raw.githubusercontent.com/${t.repo}/HEAD/${t.screenshot}`,
        legacy: !!t.legacy,
      }))
      .slice(0, limit);
    return {
      content: [{ type: "text", text: JSON.stringify({ total_matches_shown: out.length, results: out }, null, 2) }],
    };
  }
);

server.registerTool(
  "get_plugin",
  {
    title: "Get Obsidian plugin details",
    description:
      "Look up one plugin by exact id (as used in the directory) and return its full directory entry plus download/version stats.",
    inputSchema: { id: z.string().describe("Plugin id, e.g. 'dataview'") },
  },
  async ({ id }) => {
    const [plugins, stats] = await Promise.all([fetchJson("plugins"), fetchJson("stats")]);
    const p = plugins.find((x) => x.id === id);
    if (!p) {
      return { content: [{ type: "text", text: `No plugin with id '${id}' in the community directory.` }], isError: true };
    }
    const s = stats[id] || {};
    const detail = { ...p, repo_url: `https://github.com/${p.repo}`, stats: s };
    return { content: [{ type: "text", text: JSON.stringify(detail, null, 2) }] };
  }
);

server.registerTool(
  "top_plugins",
  {
    title: "Top Obsidian plugins by downloads",
    description: "List the most-downloaded community plugins, optionally filtered by keyword.",
    inputSchema: {
      query: z.string().default("").describe("Optional keyword filter"),
      limit: z.number().int().min(1).max(100).default(25),
    },
  },
  async ({ query, limit }) => {
    const [plugins, stats] = await Promise.all([fetchJson("plugins"), fetchJson("stats")]);
    const terms = toTerms(query);
    const out = plugins
      .filter((p) => terms.length === 0 || matches(`${p.name} ${p.id} ${p.author} ${p.description}`, terms))
      .map((p) => ({ id: p.id, name: p.name, author: p.author, description: p.description, downloads: stats[p.id]?.downloads ?? 0 }))
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
    return { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
