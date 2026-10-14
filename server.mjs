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
const inflight = new Map(); // key -> Promise, so parallel calls share one download
const TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const ATTEMPTS = 3;

async function download(key) {
  let lastErr;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(URLS[key], { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`Could not download ${key} after ${ATTEMPTS} attempts: ${lastErr?.message ?? lastErr}`);
}

async function fetchJson(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  if (!inflight.has(key)) {
    inflight.set(
      key,
      download(key)
        .then((data) => {
          cache.set(key, { at: Date.now(), data });
          return data;
        })
        .catch((err) => {
          if (hit) return hit.data; // serve stale data rather than fail
          throw err;
        })
        .finally(() => inflight.delete(key))
    );
  }
  return inflight.get(key);
}

// Plugin stats have one key per released version ("1.2.3": downloads).
// The newest version is the highest semver-looking key.
function latestVersion(stat) {
  if (!stat) return null;
  const versions = Object.keys(stat).filter((k) => /^\d+(\.\d+)*$/.test(k));
  if (versions.length === 0) return null;
  const cmp = (a, b) => {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const d = (pa[i] ?? 0) - (pb[i] ?? 0);
      if (d !== 0) return d;
    }
    return 0;
  };
  return versions.sort(cmp).at(-1);
}

function isoDate(ms) {
  return ms ? new Date(ms).toISOString().slice(0, 10) : null;
}

function matches(text, terms) {
  const hay = text.toLowerCase();
  return terms.every((t) => hay.includes(t));
}

function toTerms(query) {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

const server = new McpServer({ name: "obsidian-community-plugins", version: "1.2.0" });

server.registerTool(
  "search_plugins",
  {
    title: "Search Obsidian community plugins",
    description:
      "Search the official Obsidian community plugin directory (~9000 plugins) by keyword over name, id, author, and description. Use this BEFORE building or proposing any Obsidian plugin or feature, to check whether it already exists, and whenever someone asks which plugin to use. Returns the total number of matches plus the top results with downloads, latest version and last-update date (an old date means possibly abandoned), sorted by downloads.",
    inputSchema: {
      query: z.string().describe("Keywords, all must match (case-insensitive)"),
      limit: z.number().int().min(1).max(100).default(20).describe("Max results"),
    },
  },
  async ({ query, limit }) => {
    const [plugins, stats] = await Promise.all([fetchJson("plugins"), fetchJson("stats")]);
    const terms = toTerms(query);
    const matched = plugins.filter((p) => matches(`${p.name} ${p.id} ${p.author} ${p.description}`, terms));
    const out = matched
      .map((p) => ({
        id: p.id,
        name: p.name,
        author: p.author,
        description: p.description,
        repo: `https://github.com/${p.repo}`,
        downloads: stats[p.id]?.downloads ?? 0,
        latest: latestVersion(stats[p.id]),
        updated: isoDate(stats[p.id]?.updated),
      }))
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ total_matches: matched.length, shown: out.length, results: out }, null, 2),
        },
      ],
    };
  }
);

server.registerTool(
  "search_themes",
  {
    title: "Search Obsidian community themes",
    description:
      "Search the official Obsidian community theme directory (~900 themes) by keyword over name and author. Use this before designing a new theme, or to recommend one. Returns the total number of matches plus repo links, supported modes (dark/light), and screenshot URLs.",
    inputSchema: {
      query: z.string().describe("Keywords, all must match (case-insensitive). Empty-ish terms match all."),
      limit: z.number().int().min(1).max(100).default(20).describe("Max results"),
      mode: z.enum(["dark", "light", "any"]).default("any").describe("Filter by supported color mode"),
    },
  },
  async ({ query, limit, mode }) => {
    const themes = await fetchJson("themes");
    const terms = toTerms(query);
    const matchedThemes = themes
      .filter((t) => matches(`${t.name} ${t.author}`, terms))
      .filter((t) => mode === "any" || (t.modes || []).includes(mode));
    const out = matchedThemes
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
      content: [
        {
          type: "text",
          text: JSON.stringify({ total_matches: matchedThemes.length, shown: out.length, results: out }, null, 2),
        },
      ],
    };
  }
);

server.registerTool(
  "get_plugin",
  {
    title: "Get Obsidian plugin details",
    description:
      "Look up one plugin by exact id (as used in the directory) and return its entry plus downloads, latest version, last-update date and number of releases. Use this to judge whether an existing plugin is alive (recent updates, many releases) or abandoned, before deciding to build, fork, or contribute.",
    inputSchema: { id: z.string().describe("Plugin id, e.g. 'dataview'") },
  },
  async ({ id }) => {
    const [plugins, stats] = await Promise.all([fetchJson("plugins"), fetchJson("stats")]);
    const p = plugins.find((x) => x.id === id);
    if (!p) {
      return { content: [{ type: "text", text: `No plugin with id '${id}' in the community directory.` }], isError: true };
    }
    const s = stats[id] || {};
    const detail = {
      ...p,
      repo_url: `https://github.com/${p.repo}`,
      downloads: s.downloads ?? 0,
      latest: latestVersion(s),
      updated: isoDate(s.updated),
      versions_released: Object.keys(s).filter((k) => /^\d+(\.\d+)*$/.test(k)).length,
    };
    return { content: [{ type: "text", text: JSON.stringify(detail, null, 2) }] };
  }
);

server.registerTool(
  "top_plugins",
  {
    title: "Top Obsidian plugins by downloads",
    description:
      "List the most-downloaded community plugins, optionally filtered by keyword. Use this to see which plugins dominate a category before entering it.",
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

// Warm the cache in the background so the first tool call is usually instant.
// Failures are ignored here; tool calls retry on demand.
for (const key of Object.keys(URLS)) fetchJson(key).catch(() => {});
