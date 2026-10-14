---
name: obsidian-plugin-check
description: Search the official Obsidian community plugin and theme directory (8,900+ plugins) before building. Use when asked to build, design or propose an Obsidian plugin, theme or feature, or to recommend which Obsidian plugin to use.
---

# Check before you build

The Obsidian community directory is the source of truth for what already exists. Search it before writing any plugin code, and answer plugin questions from it, not from memory.

## 1. Search

Run, with one or two keywords for the core idea:

```bash
npx -y github:pitfa19/obsidian-community-plugins-mcp search pomodoro
```

The first line of output is always the match count, like `27 plugins match "pomodoro"`. If the output is empty or lacks that line, the tool did not run: use the fallback at the end of this file.

| Need | Command |
| --- | --- |
| Is one plugin alive or abandoned? | `info <plugin-id>` |
| Who dominates a category | `top <keywords>` |
| Themes | `themes <keywords> [--mode dark\|light]` |

Add `--limit N` for more results, `--json` for exact data. Search runs on name, id, author and description, and every keyword must match. Try two or three phrasings (`pomodoro`, `focus timer`), and narrow with a detail from the idea (`pomodoro sidebar`).

Done when: you have the total match count and the top results for every phrasing you tried.

## 2. Judge

Today's date decides freshness: updated within 6 months is **active**, over 12 months is **stale**.

- **Crowded:** a match with over 50,000 downloads that is active. Recommend using it or contributing to it.
- **Gap:** the best-known matches are stale, or nothing matches. Building is justified.
- **Niche:** only matches under 5,000 downloads. Building is justified if the user's idea differs; say how.

A space can be crowded and stale at once (high downloads, no recent updates). Call that a gap and name the stale leader.

Run `info <id>` on every plugin you recommend, to confirm its update date and release count.

Done when: every relevant result is placed in a bucket and every recommended plugin has been checked with `info`.

## 3. Report

Tell the user, before any code: the total number of matches, the top 3 to 5 with downloads and last-update date, and your recommendation (build, fork, or contribute) with the reason. Only then build, if they still want to.

## Fallback: curl and jq

Use when `npx` is missing or its output lacks the match-count line. Filter with `jq`: the raw files are about 5 MB each and must never be printed whole.

```bash
B=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master
curl -s $B/community-plugins.json -o /tmp/p.json
curl -s $B/community-plugin-stats.json -o /tmp/s.json
# search: every keyword must match
jq -r --slurpfile s /tmp/s.json --arg q "focus timer" '
  ($q | ascii_downcase | split(" ") | map(select(. != ""))) as $t
  | [.[] | (.name+" "+.id+" "+.author+" "+.description | ascii_downcase) as $h
   | select(all($t[]; . as $w | $h | contains($w)))
   | {id, name, d: ($s[0][.id].downloads // 0),
      u: (($s[0][.id].updated // null) | if . then ./1000 | strftime("%Y-%m-%d") else "unknown" end)}]
  | sort_by(-.d) | "\(length) matches", (.[:10][] | "\(.name) (\(.id)) | \(.d) downloads | updated \(.u)")
' /tmp/p.json
# info: one plugin's downloads, last update and release count
jq -r --arg id "pomodoro-timer" '.[$id] | "\(.downloads) downloads | updated \((.updated // 0)/1000 | strftime("%Y-%m-%d")) | \([keys[] | select(test("^[0-9]+(\\.[0-9]+)*$"))] | length) releases"' /tmp/s.json
```
