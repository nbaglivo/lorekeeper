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

List all skills available in the configured repository, with their description and compatibility.

### `lorekeeper add <skill-name>`

Fetch and install a skill into the current project. Copies the entire `skills/<skill-name>/` folder to the correct location based on the skill's `compatibility` field.

## Skill repository format

Skills live in your GitHub repository under:

```
skills/
└── <skill-name>/
    ├── SKILL.md        ← required — frontmatter declares the skill metadata
    └── ...             ← any additional files are installed alongside it
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

## Install destinations

| `compatibility` | Installed to |
|---|---|
| `claude-code` | `.claude/skills/<skill-name>/` |
| `cursor` | `.cursor/skills/<skill-name>/` |
| `both` | Both of the above |

Paths are relative to the directory where you run `lorekeeper add`.

If `compatibility` is missing or set to an unrecognised value, Lorekeeper will warn you and install to both destinations.
