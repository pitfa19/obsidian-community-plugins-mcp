# obsidian-community-plugins-mcp

**Let your AI assistant search all 8,900+ Obsidian community plugins and 870+ themes.**

An [MCP](https://modelcontextprotocol.io) server over the official Obsidian community directory — the same data that powers the in-app plugin browser. Ask your assistant things like:

> *"Find me an Obsidian plugin for spaced repetition with the most downloads"*
> *"Is there a plugin that syncs tasks with my calendar?"*
> *"Show me dark themes that also support light mode"*

and it answers from live directory data instead of hallucinating plugin names.

## Why

There was no MCP server for the Obsidian **directory** — every existing Obsidian MCP searches *your vault*. But when you ask an LLM "what plugin does X?", it guesses from stale training data: plugin names get invented, dead plugins get recommended, new ones are invisible.

This server fixes that with four small tools over the canonical source of truth, [`obsidianmd/obsidian-releases`](https://github.com/obsidianmd/obsidian-releases):

- `community-plugins.json` — every listed plugin
- `community-css-themes.json` — every listed theme
- `community-plugin-stats.json` — download counts and last-update dates

No API key. No scraping. No local index to build. One file, two dependencies.

## Tools

| Tool | What it does |
|---|---|
| `search_plugins` | Keyword search over name, id, author, description. Sorted by downloads. |
| `search_themes` | Keyword search over themes, with dark/light mode filter and screenshot URLs. |
| `get_plugin` | Full directory entry + stats for one plugin by id. |
| `top_plugins` | Most-downloaded plugins, optionally filtered by keyword. |

Results include download counts, last-update dates, and GitHub repo links, so the assistant can judge whether a plugin is popular and maintained, not just whether it exists.

## Install

Requires Node 18+.

```bash
npx obsidian-community-plugins-mcp
```

Or from source:

```bash
git clone https://github.com/pitfa19/obsidian-community-plugins-mcp
cd obsidian-community-plugins-mcp
npm install
node server.mjs
```

### Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "obsidian-community-plugins": {
      "command": "npx",
      "args": ["-y", "obsidian-community-plugins-mcp"]
    }
  }
}
```

Claude Code one-liner:

```bash
claude mcp add obsidian-community-plugins -- npx -y obsidian-community-plugins-mcp
```

### Cursor / Windsurf / other MCP clients

Any client that speaks stdio MCP works — point it at `npx -y obsidian-community-plugins-mcp`.

## Example

```
> search_plugins query="kanban" limit=3

{
  "results": [
    {
      "id": "obsidian-kanban",
      "name": "Kanban",
      "description": "Create Markdown-backed Kanban boards.",
      "repo": "https://github.com/obsidian-community/obsidian-kanban",
      "downloads": 2748406,
      "updated": "2024-05-31"
    },
    ...
  ]
}
```

## How it works

Fetches the three JSON indexes straight from GitHub raw content, caches them in memory for 10 minutes, and does case-insensitive all-terms matching. That's the whole trick — the directory is small enough (~3 MB) that nothing fancier is needed.

## Non-goals

- Searching *inside* your vault (plenty of MCPs do that already)
- Installing plugins (Obsidian's own UI is the right place)
- Mirroring plugin READMEs (results link to each repo; your assistant can fetch them)

## License

MIT
