<div align="center">

# obsidian-community-plugins-mcp

**Check before you build. Search all 8,900+ Obsidian plugins from your coding agent.**

Building an Obsidian plugin or tool? Find out what already exists, who maintains it, and where the gaps are, before you write a line of code.

[![Install in Cursor](https://img.shields.io/badge/Install_in-Cursor-000000?style=for-the-badge)](https://cursor.com/en/install-mcp?name=obsidian-plugins&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsImdpdGh1YjpwaXRmYTE5L29ic2lkaWFuLWNvbW11bml0eS1wbHVnaW5zLW1jcCJdfQ==)
[![Install in VS Code](https://img.shields.io/badge/Install_in-VS_Code-007ACC?style=for-the-badge)](https://vscode.dev/redirect/mcp/install?name=obsidian-plugins&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22github%3Apitfa19%2Fobsidian-community-plugins-mcp%22%5D%7D)

[![CI](https://github.com/pitfa19/obsidian-community-plugins-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/pitfa19/obsidian-community-plugins-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Node 18+](https://img.shields.io/badge/node-18%2B-339933?style=flat-square)](#install)
[![MCP](https://img.shields.io/badge/MCP-stdio-7c3aed?style=flat-square)](https://modelcontextprotocol.io)
[![Read-only](https://img.shields.io/badge/access-read--only-success?style=flat-square)](#safety)

[What it is](#what-it-is) · [Install](#install) · [Example](#example) · [For agents](#for-coding-agents) · [Tools](#tools) · [Safety](#safety)

</div>

---

## What it is

The Obsidian community has 8,900+ plugins, and many ideas are already taken. There are 27 plugins that mention pomodoro alone. Coding agents do not know this. Ask one to build a plugin and it starts writing, without checking whether a better one already exists. Ask it what is out there and it answers from memory: plugins that do not exist, plugins abandoned years ago, nothing recent.

**This MCP server gives your agent the real directory.** It reads the same list that Obsidian's own plugin browser uses, so the agent can check what exists before it builds.

- **Every plugin and theme.** 8,900+ plugins and 870+ themes from the official [`obsidianmd/obsidian-releases`](https://github.com/obsidianmd/obsidian-releases) index.
- **See what is alive.** Each result has downloads, latest version and last-update date. A popular plugin last updated in 2021 is a gap you could fill. A maintained one with a million downloads is a reason to contribute instead.
- **Nothing to set up.** No API key, no account, no local database. One file, two dependencies.
- **Only reads.** It never touches your vault or installs anything.

It is for anyone building Obsidian plugins, themes or tools, and for the coding agents that help them: Claude Code, Cursor, Codex and any other MCP client. It works just as well when you only want to pick the right plugin to install.

## Install

You need Node 18 or newer.

**Cursor or VS Code:** click the install button at the top of this page.

**Claude Code**

```bash
claude mcp add obsidian-plugins -- npx -y github:pitfa19/obsidian-community-plugins-mcp
```

**Claude Desktop, Windsurf and other clients.** Add this to your MCP config:

```json
{
  "mcpServers": {
    "obsidian-plugins": {
      "command": "npx",
      "args": ["-y", "github:pitfa19/obsidian-community-plugins-mcp"]
    }
  }
}
```

Restart the client. Ask *"is there already an Obsidian plugin for pomodoro timers?"* to check it works.

**To remove it**, delete that config entry, or run `claude mcp remove obsidian-plugins`. Nothing else is left on your machine except the npx cache.

## Example

> **You:** Build me an Obsidian plugin with a pomodoro timer.

Before writing code, the agent calls `search_plugins` with `"pomodoro"`. It finds 27 matches. The top ones:

| Plugin | Downloads | Latest | Updated |
| --- | ---: | --- | --- |
| TaskNotes (tasks with built-in pomodoro) | 2,113,918 | 4.13.8 | 2026-10-02 |
| Status Bar Pomodoro Timer | 67,167 | 0.1.15 | 2025-01-21 |
| Pomodoro Timer | 60,566 | 1.2.3 | 2024-05-30 |
| Pomodoro Plugin | 16,983 | 0.0.2 | 2021-05-20 |

So instead of building the 28th timer, it can tell you: *a plain timer is well covered, and TaskNotes already ties pomodoros to tasks. Three of the four best-known timers have not shipped an update since early 2025, so a maintained, focused timer is a real opening. Or contribute to one that exists.* Every name and number is real.

It works the same way when you only want to pick a plugin to install. Ask *"what should I use for flashcards?"* and you get Spaced Repetition (614,850 downloads) and newer alternatives, not guesses.

## For coding agents

Add this to your project's `AGENTS.md` or `CLAUDE.md` so your agent checks the directory on its own:

```markdown
## Obsidian plugin work

Before building any Obsidian plugin, theme or feature, search the community
directory with the obsidian-plugins MCP tools (`search_plugins`,
`search_themes`, `get_plugin`). Report what already exists, with downloads
and last-update dates, and say whether to build, fork, or contribute instead.
```

The tool descriptions are written so agents can decide on their own when to call them.

## Tools

| You want | Tool |
| --- | --- |
| Check if your idea already exists | `search_plugins`: keyword search, most downloaded first |
| Find a theme, or check a theme idea | `search_themes`: filter by dark or light mode, with screenshot links |
| Judge one plugin: alive or abandoned? | `get_plugin`: downloads, latest version, last update, release count |
| See what is popular in a category | `top_plugins`: most downloaded, optionally filtered by keyword |

Every result links to the plugin's GitHub repo, so your agent can read its README and source when it needs details.

## Safety

- **Read-only.** All four tools only read public data. Nothing is written, installed or changed.
- **One network destination.** It fetches three public JSON files from `raw.githubusercontent.com`. No other network calls, no telemetry.
- **No credentials.** It needs no API key or token and reads no environment variables.
- **No file access.** It does not read your vault or any file on disk.
- **Honest limits.** Search is plain keyword matching, not semantic. Data is cached for 10 minutes, so a plugin listed a minute ago may take that long to appear. Download counts come from Obsidian's public stats file and are not independently verified.

## How it works

On start it downloads the three index files (about 5 MB) and keeps them in memory for 10 minutes. Searches run locally against that copy, so they are instant once loaded. Downloads time out and retry, and if GitHub is unreachable it keeps serving the last good copy.

## Development

```bash
git clone https://github.com/pitfa19/obsidian-community-plugins-mcp.git && cd obsidian-community-plugins-mcp
npm install
npm test
```

`npm test` starts the server and calls every tool against the live directory.

## License

MIT. See [LICENSE](LICENSE).
