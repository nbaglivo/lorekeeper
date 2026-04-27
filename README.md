# Lorekeeper

> Distribute private, org-specific AI coding skills across your team via a GitHub repository.

## Why

Organisations build up best practices, coding conventions, and workflows that are specific to their stack and ways of working. AI coding tools like Cursor and Claude Code can be guided by custom skills — but distributing those skills means either making them public or managing files by hand across every developer machine.

Lorekeeper solves this by letting your organisation host skills in a private GitHub repository and install them with a single command. Skills stay inside your org, reach every developer instantly, and land in the right tool automatically.

## Prerequisites

- Node.js 22+
- [gh CLI](https://cli.github.com) installed and authenticated

```bash
gh auth login
```

## Install

```bash
npm install -g lorekeeper
```

Or use it without installing via `npx`:

```bash
npx lorekeeper config
npx lorekeeper list
npx lorekeeper add <skill-name>
```

## Setup

Point Lorekeeper at your skills repository:

```bash
lorekeeper config
```

This creates `~/.lorekeeper/config.json` with your repository reference.

## Commands

### `lorekeeper config`

Configure the repository to pull skills from. Creates `~/.lorekeeper/config.json`.

### `lorekeeper list`

List all skills available in the configured repository. Skills defined directly in the repo and skills referenced via `lore.json` are shown in separate sections.

### `lorekeeper add <skill-name>`

Fetch and install a skill into the current project. First looks for the skill in `skills/<skill-name>/` of your configured repository. If not found there, falls back to `lore.json` (see below).

By default, skills are installed relative to the current working directory. Use `--global` to install to your home directory instead:

```bash
lorekeeper add <skill-name> --global
```

## Skill repository format

Skills live in your GitHub repository under:

```
skills/
├── <skill-name>/
│   ├── SKILL.md        ← required — frontmatter declares the skill metadata
│   └── ...             ← any additional files are installed alongside it
└── lore.json           ← optional — references skills hosted in other repos
```

**`SKILL.md` frontmatter:**

```yaml
---
name: code-review
description: Enforces our internal code review checklist
compatibility: claude-code   # claude-code | cursor | both
---

# Skill content goes here...
```

## lore.json — cross-repo skills

`lore.json` is an optional file in the `skills/` folder that lets organisations curate a list of external skills they want to promote across their teams. Rather than forking or copying third-party skills into your own repo, you point to them by URL and Lorekeeper handles the rest. When `lorekeeper add` can't find a skill locally, it checks this file.

```json
{
  "skills": {
    "find-skills": "https://github.com/vercel-labs/skills"
  }
}
```

The value is the GitHub repo URL. Lorekeeper looks for the skill at `skills/<skill-name>/` inside that repository, following the same convention. When a skill is installed from `lore.json`, the source URL is shown prominently in the output.

External skills must have a valid `SKILL.md` with both `name` and `description` fields — Lorekeeper validates this before installing.

## Install destinations

Every install always writes to `.agents/skills/<skill-name>/` in addition to the tool-specific paths below.

| `compatibility` | Local | Global (`--global`) |
|---|---|---|
| `claude-code` | `.claude/skills/<name>/` · `.agents/skills/<name>/` | `~/.claude/skills/<name>/` · `~/.agents/skills/<name>/` |
| `cursor` | `.cursor/skills/<name>/` · `.agents/skills/<name>/` | `~/.cursor/skills/<name>/` · `~/.agents/skills/<name>/` |
| `both` | All three local paths | All three global paths |

Local paths are relative to the directory where you run `lorekeeper add`.

If `compatibility` is missing or set to an unrecognised value, Lorekeeper will warn you and install to all destinations.
