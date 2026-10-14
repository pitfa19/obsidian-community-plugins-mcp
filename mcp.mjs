// MCP server: exposes the shared search functions as four read-only tools.
// https://github.com/pitfa19/obsidian-community-plugins-mcp
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getPlugin, prefetch, searchPlugins, searchThemes, topPlugins } from "./lib.mjs";
import { VERSION } from "./version.mjs";

const json = (value) => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }] });

export async function startMcpServer() {
  const server = new McpServer({ name: "obsidian-community-plugins", version: VERSION });

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
    async (args) => json(await searchPlugins(args))
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
    async (args) => json(await searchThemes(args))
  );

  server.registerTool(
    "get_plugin",
    {
      title: "Get Obsidian plugin details",
      description:
        "Look up one plugin by exact id (as used in the directory) and return its entry plus downloads, latest version, last-update date and number of releases. Use this to judge whether an existing plugin is alive (recent updates, many releases) or abandoned, before deciding to build, fork, or contribute.",
      inputSchema: { id: z.string().describe("Plugin id, e.g. 'dataview'") },
    },
    async (args) => {
      const plugin = await getPlugin(args);
      if (!plugin) {
        return { content: [{ type: "text", text: `No plugin with id '${args.id}' in the community directory.` }], isError: true };
      }
      return json(plugin);
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
    async (args) => json(await topPlugins(args))
  );

  await server.connect(new StdioServerTransport());

  // Warm the cache in the background so the first tool call is usually instant.
  // Failures are ignored here; tool calls retry on demand.
  prefetch();
}
