// Shared search logic for the MCP server and the CLI.
// Data source: obsidianmd/obsidian-releases JSON indexes + plugin download stats.
// https://github.com/pitfa19/obsidian-community-plugins-mcp

const BASE = "https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master";
export const URLS = {
  plugins: `${BASE}/community-plugins.json`,
  themes: `${BASE}/community-css-themes.json`,
  stats: `${BASE}/community-plugin-stats.json`,
};

const cache = new Map(); // key -> { at, data }
const inflight = new Map(); // key -> Promise, so parallel calls share one download
const TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const ATTEMPTS = 3;

// Optional disk cache. The CLI runs once per command, so without it every
// call would re-download ~5 MB. The MCP server keeps data in memory instead.
let diskDir = null;
export function useDiskCache(dir) {
  diskDir = dir;
}

async function readDisk(key) {
  if (!diskDir) return null;
  const { readFile, stat } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const file = join(diskDir, `${key}.json`);
  try {
    const info = await stat(file);
    if (Date.now() - info.mtimeMs > TTL_MS) return null;
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

async function writeDisk(key, data) {
  if (!diskDir) return;
  const { mkdir, writeFile, rename } = await import("node:fs/promises");
  const { join } = await import("node:path");
  try {
    await mkdir(diskDir, { recursive: true });
    const tmp = join(diskDir, `${key}.${process.pid}.tmp`);
    await writeFile(tmp, JSON.stringify(data));
    await rename(tmp, join(diskDir, `${key}.json`)); // atomic, safe for parallel runs
  } catch {
    // A failed cache write only costs speed next time.
  }
}

async function download(key) {
  const cached = await readDisk(key);
  if (cached) return cached;
  let lastErr;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(URLS[key], { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      await writeDisk(key, data);
      return data;
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`Could not download ${key} after ${ATTEMPTS} attempts: ${lastErr?.message ?? lastErr}`);
}

export async function fetchJson(key) {
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

export function prefetch() {
  for (const key of Object.keys(URLS)) fetchJson(key).catch(() => {});
}

const VERSION_KEY = /^\d+(\.\d+)*$/;

// Plugin stats have one key per released version ("1.2.3": downloads).
// The newest version is the highest semver-looking key.
function latestVersion(stat) {
  if (!stat) return null;
  const versions = Object.keys(stat).filter((k) => VERSION_KEY.test(k));
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

function toTerms(query) {
  return String(query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
}

function matches(text, terms) {
  const hay = text.toLowerCase();
  return terms.every((t) => hay.includes(t));
}

const pluginText = (p) => `${p.name} ${p.id} ${p.author} ${p.description}`;

function pluginRow(p, stat) {
  return {
    id: p.id,
    name: p.name,
    author: p.author,
    description: p.description,
    repo: `https://github.com/${p.repo}`,
    downloads: stat?.downloads ?? 0,
    latest: latestVersion(stat),
    updated: isoDate(stat?.updated),
  };
}

export async function searchPlugins({ query, limit = 20 }) {
  const [plugins, stats] = await Promise.all([fetchJson("plugins"), fetchJson("stats")]);
  const terms = toTerms(query);
  const matched = plugins.filter((p) => matches(pluginText(p), terms));
  const results = matched
    .map((p) => pluginRow(p, stats[p.id]))
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, limit);
  return { total_matches: matched.length, shown: results.length, results };
}

export async function searchThemes({ query, limit = 20, mode = "any" }) {
  const themes = await fetchJson("themes");
  const terms = toTerms(query);
  const matched = themes
    .filter((t) => matches(`${t.name} ${t.author}`, terms))
    .filter((t) => mode === "any" || (t.modes || []).includes(mode));
  const results = matched.slice(0, limit).map((t) => ({
    name: t.name,
    author: t.author,
    repo: `https://github.com/${t.repo}`,
    modes: t.modes || [],
    screenshot: `https://raw.githubusercontent.com/${t.repo}/HEAD/${t.screenshot}`,
    legacy: !!t.legacy,
  }));
  return { total_matches: matched.length, shown: results.length, results };
}

// Returns null when the id is not in the directory.
export async function getPlugin({ id }) {
  const [plugins, stats] = await Promise.all([fetchJson("plugins"), fetchJson("stats")]);
  const p = plugins.find((x) => x.id === id);
  if (!p) return null;
  const s = stats[id] || {};
  return {
    ...pluginRow(p, s),
    versions_released: Object.keys(s).filter((k) => VERSION_KEY.test(k)).length,
  };
}

export async function topPlugins({ query = "", limit = 25 }) {
  const [plugins, stats] = await Promise.all([fetchJson("plugins"), fetchJson("stats")]);
  const terms = toTerms(query);
  return plugins
    .filter((p) => terms.length === 0 || matches(pluginText(p), terms))
    .map((p) => pluginRow(p, stats[p.id]))
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, limit);
}
