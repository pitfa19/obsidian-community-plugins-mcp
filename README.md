<div align="center">

# obsidian-community-plugins-mcp

**Ask your AI which Obsidian plugin to use. Get a real answer.**

Your assistant searches all 8,900+ community plugins and 870+ themes, live, with download counts and versions.

[![Install in Cursor](https://img.shields.io/badge/Install_in-Cursor-000000?style=for-the-badge)](https://cursor.com/en/install-mcp?name=obsidian-plugins&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsImdpdGh1YjpwaXRmYTE5L29ic2lkaWFuLWNvbW11bml0eS1wbHVnaW5zLW1jcCJdfQ==)
[![Install in VS Code](https://img.shields.io/badge/Install_in-VS_Code-007ACC?style=for-the-badge)](https://vscode.dev/redirect/mcp/install?name=obsidian-plugins&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22github%3Apitfa19%2Fobsidian-community-plugins-mcp%22%5D%7D)

[![CI](https://github.com/pitfa19/obsidian-community-plugins-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/pitfa19/obsidian-community-plugins-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Node 18+](https://img.shields.io/badge/node-18%2B-339933?style=flat-square)](#install)
[![MCP](https://img.shields.io/badge/MCP-stdio-7c3aed?style=flat-square)](https://modelcontextprotocol.io)
[![Read-only](https://img.shields.io/badge/access-read--only-success?style=flat-square)](#safety)

[What it is](#what-it-is) · [Install](#install) · [Example](#example) · [Tools](#tools) · [Safety](#safety)

</div>

---

## What it is

Ask Claude or ChatGPT "what's the best Obsidian plugin for X?" and it answers from memory. It names plugins that do not exist, recommends ones abandoned years ago, and has never heard of anything new.

**This MCP server gives your assistant the real directory.** It reads the same list that Obsidian's own plugin browser uses, so answers are current.

- **Every plugin and theme.** 8,900+ plugins and 870+ themes from the official [`obsidianmd/obsidian-releases`](https://github.com/obsidianmd/obsidian-releases) index.
- **Signals, not just names.** Each result has downloads, latest version and last-update date, so your assistant can tell a popular, maintained plugin from a dead one.
- **Nothing to set up.** No API key, no account, no local database. One file, two dependencies.
- **Only reads.** It never touches your vault or installs anything.

It is for anyone who uses Obsidian with Claude Desktop, Claude Code, Cursor or any other MCP client.

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

Restart the client. Ask *"find me an Obsidian plugin for spaced repetition"* to check it works.

**To remove it**, delete that config entry, or run `claude mcp remove obsidian-plugins`. Nothing else is left on your machine except the npx cache.

## Example

> **You:** I want flashcards in Obsidian. What should I install?

The assistant calls `search_plugins` with `"spaced repetition"` and gets live data:

| Plugin | Downloads | Latest | Updated |
| --- | ---: | --- | --- |
| Spaced Repetition | 614,850 | 1.15.4 | 2026-06-14 |
| LearnKit | 26,531 | 1.8.2 | 2026-09-14 |
| Aosr | 16,251 | 1.2.2 | 2026-10-05 |

So it can answer: *Spaced Repetition is the established choice. LearnKit is newer and actively updated if you want tests as well as flashcards.* Every name is real.

## Tools

| You want | Tool |
| --- | --- |
| Find plugins for a task | `search_plugins`: keyword search, most downloaded first |
| Find a theme | `search_themes`: filter by dark or light mode, with screenshot links |
| Check one plugin before installing | `get_plugin`: downloads, latest version, last update, release count |
| See what is popular | `top_plugins`: most downloaded, optionally filtered by keyword |

Every result links to the plugin's GitHub repo, so your assistant can read its README when you want details.

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
