# Lorekeeper

> Install private, organization-specific skills for Cursor and Claude Code directly from a GitHub repository.

## Why

Teams accumulate best practices, coding conventions, and workflows that are specific to their stack and ways of working. Most AI coding tools support custom skills or rules — but sharing them means either making them public or managing files by hand across every developer machine.

Lorekeeper solves this by letting you host skills in a private GitHub repository and install them with a single command. The right guidance lands in the right tool, stays private, and stays in sync.

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

## Setup

Point Lorekeeper at your skills repository:

```bash
lorekeeper config
```

This creates `~/.lorekeeper/config.json` with your repository reference.

## Usage

```bash
lorekeeper add <skill-name>
```

Fetches the entire `skills/<skill-name>/` folder from your configured repository and installs it to the correct location based on the skill's `compatibility` field.

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
