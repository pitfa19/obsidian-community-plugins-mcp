#!/usr/bin/env node
// obsidian-community-plugins-mcp
// Search the official Obsidian community plugin and theme directory.
//
//   No arguments      -> MCP server over stdio (what MCP clients launch)
//   A subcommand      -> command-line tool for agents and shells
//
// https://github.com/pitfa19/obsidian-community-plugins-mcp

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "mcp") {
  const { startMcpServer } = await import("./mcp.mjs");
  await startMcpServer();
} else {
  const { runCli } = await import("./cli.mjs");
  process.exitCode = await runCli(args);
}
