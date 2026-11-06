---
name: heptabase-cli
description: Use the local heptabase CLI whenever the user mentions Heptabase or shares an app.heptabase.com URL/deep link. Search the knowledge base by keyword or meaning; read, create, and edit notes and journals in Hepta Markdown; follow and update Space Instructions; process the Inbox; work with tags, tag databases, and properties; read chats, files, highlights, backlinks, PDFs, and transcripts; save files, web pages, and YouTube videos as cards; and organize, lay out, and visualize whiteboards and mind maps through the running desktop app. Also browse AI Tutor goals, courses, and lessons. The CLI's own System Manual holds the detailed rules. Do not open Heptabase links in an agent browser unless the user asks.
allowed-tools: Bash(heptabase *) Bash(jq *) Bash(mktemp *)
metadata:
  heptabase-cli-version-range: ">=0.10.0"
---

## Prerequisites

- CLI installed from the desktop app. The command is `heptabase` on macOS/Linux; Windows installs `heptabase.cmd` for cmd/PowerShell and a `heptabase` shim for POSIX shells.
- Check the version before use with `heptabase --version`. This skill needs CLI `>=0.10.0`. If the installed CLI is older, you MUST stop and ask the user to update the Heptabase desktop app before continuing.

## Read the CLI System Manual first

Before your first other `heptabase` command in a session, run `heptabase system-manual read concepts` and follow it. The CLI's System Manual is the source of truth for working in Heptabase with the CLI, and `concepts` tells you which of its other pages to read and when.
