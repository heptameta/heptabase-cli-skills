---
name: heptabase-cli
description: Use the local heptabase CLI whenever the user mentions Heptabase or shares an app.heptabase.com URL/deep link. Search the knowledge base by keyword or meaning; read, create, and edit notes and journals in Hepta Markdown; follow and update Space Instructions; process the Inbox; work with tags, tag databases, and properties; read chats, files, highlights, backlinks, PDFs, and transcripts; save files, web pages, and YouTube videos as cards; and organize, lay out, and visualize whiteboards and mind maps through the running desktop app. Also browse AI Tutor goals, courses, and lessons. The CLI's own System Manual holds the detailed rules. Do not open Heptabase links in an agent browser unless the user asks.
allowed-tools: Bash(heptabase *) Bash(jq *) Bash(mktemp *)
metadata:
  heptabase-cli-version-range: "0.10.x"
---

## Prerequisites

- CLI installed from the desktop app. The command is `heptabase` on macOS/Linux; Windows installs `heptabase.cmd` for cmd/PowerShell and a `heptabase` shim for POSIX shells.
- Check version compatibility before use with `heptabase --version`. If the installed CLI version is outside this skill's compatibility range (`0.10.x`), you MUST stop and ask the user to update either the Heptabase desktop app or this skill package before continuing.

## Read the CLI System Manual first

The CLI ships its own System Manual: how to work in Heptabase with the CLI. It is the source of truth for Space Instructions, output and errors, Heptabase links, object types, writing and editing content, tag databases and properties, the Inbox, saving sources, reading files, organizing the knowledge base, and whiteboard layout, visualization, and mind maps. This skill gets you to it and adds only what it does not cover.

- Before your first other `heptabase` command in a session, run `heptabase system-manual read concepts` and follow it. It starts by having you read the user's Space Instructions with `heptabase space-instructions read`, and it ends with the other pages and when to read each.
- Before a task that a page's description covers, read that page with `heptabase system-manual read <path>`. Without a path, the command lists every page. It works without the desktop app.
- When a command's `--help` says "Before first use, read the `<path>` page", read that page before you first run the command.
- `heptabase --help` lists the commands, and `heptabase <command> <subcommand> --help` shows usage. For commands that take JSON (`--input`, `tag edit --edits`, `tag query --filter` and `--sorts`), `--help` also prints the JSON Schema of that input; write the JSON from it.

## Not in the manual

These details are not in the System Manual or `--help` yet. Everything else is.

### Reading

- **Journals over a period:** `heptabase journal read-range --start-date <YYYY-MM-DD> --end-date <YYYY-MM-DD>` reads every journal in the inclusive range, oldest first, as `{ content }`, skipping dates without a journal. One call covers at most 185 days; read a longer period in several ranges.
- **Chats:** copy a chat ID from `whiteboard read` output or a `/chat/<id>` link, then page through the chat's messages, with each message's author and any message it quotes, with `heptabase object read chat <chatId> --offset <n> --limit <n>`. For a chat-messages element on a whiteboard, use `heptabase object read chatMessagesElement <elementId>`.
- **File URIs in reads:** `object read`, `whiteboard read`, and search results show a PDF or media card's own file as `file: <fileUri>`. Pass that URI to `file export` directly; you do not need `file list` first.
- **AI Tutor:** `heptabase goal list` lists root goals with their courses; `heptabase course list` and `course read <courseId>` give courses and their syllabus; `heptabase lesson list <courseId>`, `lesson read <lessonId>`, and `lesson list-messages <lessonId>` give lessons, their plans and generated cards, and their chat messages. Read a generated card with `heptabase object read card <cardId>`.

### Writing

- **Inline math:** `$x^2$` in Hepta Markdown becomes inline math. The opening `$` must be followed by a character that is neither a space nor a digit, and the closing `$` must follow a character that is not a space, so `$10 and $20` stays text.

### Tag databases

- **Relation properties in `tag edit`:** in a `createProperty` edit for a `relation` property, `tagId` is the tag whose database the relation points at, not the tag you are editing.
- **`tag query --filter`:** a rule on the field `keyword` (`contains` or `doesNotContain`) matches text in the card.
- **`tag query` values:** an empty value is `null`, a date range is `YYYY-MM-DD to YYYY-MM-DD`, and a relation is a list of references such as `card/<cardId>` or `journal/<YYYY-MM-DD>`. Drop the `<type>/` prefix before you use an ID in a filter or `card set-property`.

### Files

- **`The workspace changed during file import.`:** the user switched spaces in the app while the file was importing. Ask them to switch back, then import again.

### Whiteboards and mind maps

- **`arrange-objects` and `align-objects` are all or nothing:** when the plan fails, the call returns `status: "failed"` and nothing moves.
- **Mind map root:** `update-mind-map` cannot apply `moveNode`, `deleteSubtree`, or `setEdgeColor` to the root node; it fails with `rootMutationNotAllowed` and nothing changes.
- **Narrow whiteboard commands:** `whiteboard add-card` leaves a card that is already on the whiteboard unchanged, unlike `place-objects`, which adds another instance each time. `whiteboard remove-card` removes every instance of the card. For other placement and layout work, use the commands that `whiteboard-layout` describes.
- **No arbitrary shapes:** the CLI cannot draw shapes on a whiteboard.

## Troubleshooting

- **Codex sandbox:** `concepts` says to retry outside the sandbox when the app is open with the CLI on but commands cannot connect. For a lasting fix in Codex's `workspace-write` mode, ask the user to add `[sandbox_workspace_write]` with `network_access = true` to `~/.codex/config.toml` and restart Codex.
- **Request limits:** the desktop app rejects a JSON request body over 1 MiB (1,048,576 bytes) and times out a request whose body takes more than 10 seconds to arrive. `file import` uploads can be up to 2000 MB.
