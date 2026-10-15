<div align="center">

# obsidian-community-plugins-mcp

**Check before you build. Search all 9,000+ Obsidian plugins from your coding agent.**

Building an Obsidian plugin or tool? Find out what already exists, who maintains it, and where the gaps are, before you write a line of code.

[![Install in Cursor](https://img.shields.io/badge/Install_in-Cursor-000000?style=for-the-badge)](https://cursor.com/en/install-mcp?name=obsidian-plugins&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIm9ic2lkaWFuLWNvbW11bml0eS1wbHVnaW5zLW1jcCJdfQ==)
[![Install in VS Code](https://img.shields.io/badge/Install_in-VS_Code-007ACC?style=for-the-badge)](https://vscode.dev/redirect/mcp/install?name=obsidian-plugins&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22obsidian-community-plugins-mcp%22%5D%7D)

[![CI](https://github.com/pitfa19/obsidian-community-plugins-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/pitfa19/obsidian-community-plugins-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Node 18+](https://img.shields.io/badge/node-18%2B-339933?style=flat-square)](#install)
[![MCP](https://img.shields.io/badge/MCP-stdio-7c3aed?style=flat-square)](https://modelcontextprotocol.io)
[![Read-only](https://img.shields.io/badge/access-read--only-success?style=flat-square)](#safety)

[What it is](#what-it-is) · [Install](#install) · [Example](#example) · [Command line](#command-line) · [Tools](#mcp-tools) · [Safety](#safety)

</div>

---

## What it is

The Obsidian community has 9,000+ plugins, and many ideas are already taken. There are 27 plugins that mention pomodoro alone. Coding agents do not know this. Ask one to build a plugin and it starts writing, without checking whether a better one already exists. Ask it what is out there and it answers from memory: plugins that do not exist, plugins abandoned years ago, nothing recent.

**This gives your agent the real directory**, the same list Obsidian's own plugin browser uses, so it can check what exists before it builds. Use it as a **skill**, a **command**, or an **MCP server**.

- **Every plugin and theme.** 9,000+ plugins and 880+ themes from the official [`obsidianmd/obsidian-releases`](https://github.com/obsidianmd/obsidian-releases) index.
- **See what is alive.** Each result has downloads, latest version and last-update date. A popular plugin last updated in 2021 is a gap you could fill. A maintained one with a million downloads is a reason to contribute instead.
- **Nothing to set up.** No API key, no account, no local database. Two dependencies.
- **Only reads.** It never touches your vault or installs anything.

It is for anyone building Obsidian plugins, themes or tools, and for the coding agents that help them: Claude Code, Codex, Cursor and others. It works just as well when you only want to pick the right plugin to install.

## Install

You need Node 18 or newer. Pick one way:

| You use | Best fit | Why |
| --- | --- | --- |
| A coding agent with a terminal (Claude Code, Codex, jcode) | **Skill** | Costs your agent's context almost nothing until it is needed |
| A chat app without a terminal (Claude Desktop, Cursor chat) | **MCP server** | The app calls the tools directly |
| Your own shell or scripts | **Command** | Plain text or JSON output |

### Skill

Copy the skill into your agent's skills folder. For Claude Code:

```bash
mkdir -p ~/.claude/skills/obsidian-plugin-check
curl -sL https://raw.githubusercontent.com/pitfa19/obsidian-community-plugins-mcp/main/skills/obsidian-plugin-check/SKILL.md \
  -o ~/.claude/skills/obsidian-plugin-check/SKILL.md
```

Other agents: put [`SKILL.md`](skills/obsidian-plugin-check/SKILL.md) wherever they load skills, or paste it into `AGENTS.md`. The agent then searches the directory by itself whenever you ask it to build an Obsidian plugin. If Node is missing, the skill falls back to `curl` and `jq`.

### MCP server

**Cursor or VS Code:** click the install button at the top of this page.

**Claude Code:**

```bash
claude mcp add obsidian-plugins -- npx -y obsidian-community-plugins-mcp
```

**Claude Desktop, Windsurf and other clients.** Add this to your MCP config:

```json
{
  "mcpServers": {
    "obsidian-plugins": {
      "command": "npx",
      "args": ["-y", "obsidian-community-plugins-mcp"]
    }
  }
}
```

Restart the client. Ask *"is there already an Obsidian plugin for pomodoro timers?"* to check it works.

**To remove it**, delete the skill folder or the MCP config entry (`claude mcp remove obsidian-plugins`). The only other trace is a 4 MB cache in `~/.cache/obsidian-community-plugins`, created by the command line.

### From a local copy

To run it from files on your machine instead of from GitHub (offline use, a fork, or your own changes), clone it and point every install at that folder:

```bash
git clone https://github.com/pitfa19/obsidian-community-plugins-mcp.git ~/obsidian-community-plugins-mcp
cd ~/obsidian-community-plugins-mcp && npm install
```

| Way | Use |
| --- | --- |
| Command | `node ~/obsidian-community-plugins-mcp/server.mjs search pomodoro` |
| Skill | `cp -r ~/obsidian-community-plugins-mcp/skills/obsidian-plugin-check ~/.claude/skills/`, then change the skill's `npx -y obsidian-community-plugins-mcp` lines to `node ~/obsidian-community-plugins-mcp/server.mjs` |
| MCP server | `"command": "node", "args": ["/full/path/to/obsidian-community-plugins-mcp/server.mjs"]` in your MCP config. Use the full path; `~` is not expanded there. |

To pass a single file around, build a package with `npm pack` and install it anywhere with `npm install ./obsidian-community-plugins-mcp-1.3.0.tgz`.

## Example

> **You:** Build me an Obsidian plugin with a pomodoro timer.

Before writing code, the agent runs `search pomodoro`. It finds 27 matches. The top ones:

| Plugin | Downloads | Latest | Updated |
| --- | ---: | --- | --- |
| TaskNotes (tasks with built-in pomodoro) | 2,113,918 | 4.13.8 | 2026-10-02 |
| Status Bar Pomodoro Timer | 67,167 | 0.1.15 | 2025-01-21 |
| Pomodoro Timer | 60,566 | 1.2.3 | 2024-05-30 |
| Pomodoro Plugin | 16,983 | 0.0.2 | 2021-05-20 |

So instead of building the 28th timer, it can tell you: *this category is crowded and alive. TaskNotes already ties pomodoros to tasks, and dedicated timers such as Gentle Pomodoro (updated 2026-10-08), Minidoro and PomoBar are maintained. Only 4 of the 27 matches have gone a year without an update. Contribute to one that exists, or build something clearly different.* Every name and number is real, and "27 matches" counts plugins that mention the word, so a few only mention it in passing.

It works the same way when you only want to pick a plugin to install. Ask *"what should I use for flashcards?"* and you get Spaced Repetition (614,850 downloads) and newer alternatives, not guesses.

## Command line

The same search, as a command. This is what the skill runs.

```bash
npx -y obsidian-community-plugins-mcp search pomodoro
```

```text
27 plugins match "pomodoro" (top 10 by downloads)

TaskNotes (tasknotes) | 2,113,918 downloads | v4.13.8 | updated 2026-10-02
    Note-based task management with calendar, pomodoro and time-tracking integration.
    https://github.com/callumalpass/tasknotes
...
```

| Command | What it does |
| --- | --- |
| `search <keywords>` | Plugins matching all keywords, most downloaded first |
| `info <plugin-id>` | One plugin: downloads, latest version, last update, releases |
| `top [keywords]` | Most downloaded plugins, optionally filtered |
| `themes [keywords]` | Themes, with `--mode dark` or `--mode light` |

Add `--limit N` for more results and `--json` for machine-readable output. Exit code 1 means "not found", 2 a usage error, 3 a network failure. Run with no command and it starts the MCP server instead.

## MCP tools

| You want | Tool |
| --- | --- |
| Check if your idea already exists | `search_plugins`: keyword search, most downloaded first |
| Find a theme, or check a theme idea | `search_themes`: filter by dark or light mode, with screenshot links |
| Judge one plugin: alive or abandoned? | `get_plugin`: downloads, latest version, last update, release count |
| See what is popular in a category | `top_plugins`: most downloaded, optionally filtered by keyword |

The tool descriptions tell the agent to search before it builds, so it calls them on its own. Every result links to the plugin's GitHub repo, so your agent can read its README and source when it needs details.

## Safety

- **Read-only toward the world.** Every tool and command only reads public data. Nothing is installed, and your vault is never touched.
- **One network destination.** It fetches three public JSON files from `raw.githubusercontent.com`. No other network calls, no telemetry.
- **No credentials.** It needs no API key or token.
- **One local file write.** The command line caches the index in `~/.cache/obsidian-community-plugins` (or `$XDG_CACHE_HOME`). The MCP server keeps it in memory only.
- **Honest limits.** Search is plain keyword matching, not semantic. Data is cached for 10 minutes, so a plugin listed a minute ago may take that long to appear. Download counts come from Obsidian's public stats file and are not independently verified.

## How it works

It downloads the three index files (about 5 MB) and keeps them for 10 minutes: in memory for the MCP server, on disk for the command line, so repeat commands take about 0.1 seconds. Searches run locally against that copy. Downloads time out and retry, and if GitHub is unreachable it keeps serving the last good copy.

## Development

```bash
git clone https://github.com/pitfa19/obsidian-community-plugins-mcp.git && cd obsidian-community-plugins-mcp
npm install
npm test
```

`npm test` starts the MCP server and the command line, checks every tool against the live directory, and checks that both return identical results.

## Releasing

Pushing a version tag publishes to npm through GitHub Actions (trusted publishing, no stored token):

```bash
npm version patch
git push --follow-tags
```

The workflow checks that the tag matches `package.json`, runs the tests, then publishes with provenance.

## License

MIT. See [LICENSE](LICENSE).
