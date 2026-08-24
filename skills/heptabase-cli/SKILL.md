---
name: heptabase-cli
description: Use the local heptabase CLI whenever the user mentions Heptabase or shares an app.heptabase.com URL/deep link. Read and edit notes, journals, tags, and properties; read chats, messages, and files; and work with whiteboard structure and layout through the running desktop app, including sections, connections, mind maps, lint, and schematic screenshots. Also browse AI Tutor goals, courses, and lessons. Do not open Heptabase links in an agent browser unless the user asks.
allowed-tools: Bash(heptabase *) Bash(jq *) Bash(mktemp *)
metadata:
  heptabase-cli-version-range: "0.6.x"
---

## Prerequisites

- CLI installed from the desktop app. The command is `heptabase` on macOS/Linux; Windows installs `heptabase.cmd` for cmd/PowerShell and a `heptabase` shim for POSIX shells.
- Check version compatibility before use with `heptabase --version`. If the installed CLI version is outside this skill's compatibility range (`0.6.x`), you MUST stop and ask the user to update either the Heptabase desktop app or this skill package before continuing.

## Command discovery

Run `heptabase help` to see all available top-level commands. This is always up to date. Each command supports `--help` for detailed usage:

```bash
heptabase help
heptabase note --help
heptabase note create --help
```

## Common recipes

Use these as quick recipes for frequent requests. For less common flags or if a command fails, run `heptabase help` or `<command> --help` to discover the correct syntax.

- **Recent cards:** `heptabase card list --sort createdTime --direction descending --limit 20`
- **Today's journal:** `heptabase journal read $(date +%Y-%m-%d)`
- **Search cards by keyword:** `heptabase card list -q "<keyword>" --limit 20`
- **Create a note from markdown:** `heptabase note create --content "# Title\n\nBody"` (marks Created by AI by default; add `--no-created-by-ai` for human-owned content).
- **Create today's journal from markdown:** `heptabase journal create --content "Body"` (marks Created by AI by default; add `--no-created-by-ai` for human-owned content).
- **Append markdown to a note:** `heptabase note append <cardId> --content "More content"`.
- **Edit note content with JSON save:** first read `references/card-content-schema.md`, then use `heptabase note read <cardId>`, modify the returned ProseMirror JSON, and save with `heptabase note save <cardId> --content-md5 <contentMd5> --content-file <path>`.
- **Work with properties:** use `heptabase tag cards <tagId> --include-properties` to list tagged cards with values, or `heptabase card properties <cardIdOrDate>` to inspect one card. Before writing, read `references/property-values.md`, inspect definitions with `heptabase tag properties <tagId>`, then use `heptabase card set-property <cardIdOrDate> --property-id <propertyId> --value "Published"` for strings/options or `--json-value ...` for typed JSON values.
- **Read parsed PDF content:** first read `references/pdf-reading.md`, then use `heptabase pdf metadata <pdfCardId>` to discover `totalPages`, and read a page range with `heptabase pdf read <pdfCardId> --start-page N --end-page N`.
- **Read transcript content:** first read `references/transcript-reading.md`, then use `heptabase audio metadata <audioCardId>` or `heptabase video metadata <videoCardId>` to discover `transcriptStatus` and `durationSeconds`, and read overlapping transcript entries in a time range with `heptabase audio read <audioCardId> --start-seconds 0 --end-seconds 300` or `heptabase video read <videoCardId> --start-seconds 0 --end-seconds 300`.
- **Read an attached file:** first read `references/file-reading.md`. If needed, find its ID with `heptabase file list --card-id <cardId>`, then run `mktemp -d` and `heptabase file export <fileId> --output-dir <scratchDir>`. Read the returned `path` with your native file-reading tool.
- **Inspect a whiteboard:** `heptabase whiteboard read <whiteboardId> --mode structure`, then `heptabase whiteboard read-layout <whiteboardId>`.
- **Read chat messages:** Copy a chat ID from `whiteboard read` output, then use `heptabase object read chat <chatId> --offset <n> --limit <n>` to paginate non-removed messages with their displayed author, timestamp, quoted content, and message content. For a whiteboard chat-messages element, use `heptabase object read chatMessagesElement <elementId> --offset <n> --limit <n>`.
- **Check or view whiteboard layout:** run `heptabase whiteboard lint <whiteboardId>`. For visual review, first read `references/whiteboard.md`, then use `heptabase whiteboard screenshot <whiteboardId> --output <existingDirectory>/whiteboard.png` and inspect the returned local path.
- **Change whiteboard layout or a mind map:** first read `references/whiteboard.md`; for mind maps, also read `references/mind-maps.md`. Commands with nested or batch input use `--input <path|->` and canonical JSON.

## Heptabase URLs (Deep links)

When the user shares a Heptabase URL (aka. deep link), use the CLI to read it — do NOT open it in a browser if the user does not explicitly ask you to (the app requires authentication and browsers used by agents are typically not logged in).

URL patterns and how to handle them:

- **Journal card:** `https://app.heptabase.com/<workspaceId>/card/<YYYY-MM-DD>` → `heptabase journal read <YYYY-MM-DD>`
- **Card by UUID:** `https://app.heptabase.com/<workspaceId>/card/<uuid>` → first run `heptabase card properties <uuid>` to discover the card type, then read its content with the matching command (`heptabase note read <uuid>`, `heptabase pdf metadata <uuid>`, etc.).
- **Whiteboard:** `https://app.heptabase.com/<workspaceId>/whiteboard/<uuid>` → run `heptabase whiteboard read <uuid> --mode structure` and `heptabase whiteboard read-layout <uuid>`. Read `references/whiteboard.md` before any layout mutation or visual judgment.

The `<workspaceId>` segment in the URL is not needed by the CLI — extract only the card/whiteboard ID.

## Note and journal card content editing

Use `create` / `append` with Markdown for ordinary writing. Before calling `heptabase note save` / `heptabase journal save` with ProseMirror JSON, you MUST read `references/card-content-schema.md`. Also read it before generating Markdown that uses Heptabase-specific extensions such as card mentions, whiteboard mentions, dates, videos, math, or toggle/todo lists.

## Created by AI marking

`note create` and `journal create` mark content as Created by AI by default. Before deciding whether to pass `--no-created-by-ai`, you MUST read `references/created-by-ai.md`.

## Property editing

Before setting a property value, you MUST read `references/property-values.md` and inspect the target property with `heptabase card properties <cardIdOrDate>` and/or `heptabase tag properties <tagId>`. Property formats vary by type, and relation writes replace the full relation value. For relation properties, use `heptabase tag properties <sourceTagId>` to get the property definition's `relationTargetTagId`, then list valid related cards before writing.

## File reading

Before reading/listing files or exporting a file, you MUST read `references/file-reading.md`.

## PDF reading

Before reading parsed PDF content, you MUST read `references/pdf-reading.md`.

## Transcript reading

Before reading parsed media transcripts, you MUST read `references/transcript-reading.md`.

## Whiteboard work

Before deliberate placement, movement, arrangement, resizing, sectioning, connection work, removal, or visual verification, you MUST read `references/whiteboard.md`. It defines exact placement references, selection and destination shapes, read-before-write rules, and the verification loop.

For mind-map creation or structural edits, also read `references/mind-maps.md`. Read the current mind map again before updating it so stable structural node IDs are current.

The existing `whiteboard cards`, `add-card`, and `remove-card` commands are narrow legacy commands. Prefer `whiteboard read`, `read-layout`, and the canonical `--input` commands for structured whiteboard work.

The canonical mutation commands cover whiteboard hierarchy and shortcuts; object placement and cross-whiteboard moves; move, arrange, align, resize, color, and removal; Sections and connections; and mind-map creation and updates. Run `heptabase whiteboard --help` for the current list and read the linked references for nested input.

## Canonical JSON input

Commands with nested or batch data accept `--input <path|->`; `-` reads JSON from stdin. Build JSON with `jq` or write it to a temporary file. Do not interpolate untrusted text into hand-built shell JSON.

Inspect every mutation result. A handled top-level `status: "failed"` is printed and exits with status `1`. A successful top-level result exits with `0` even when item results contain `failureReasonCode` fields, so check them before reporting full success.

## All output is JSON

Every command prints JSON to stdout. You can parse it with `jq` or pipe it to other tools. `whiteboard screenshot` writes the PNG to `--output` and prints metadata only; it never prints image bytes.

## Troubleshooting

- **Desktop app must be running.** The CLI communicates with a local server inside the app. If the app is closed, all commands fail. Run `heptabase start` to launch and wait for readiness.
- **Codex sandbox may block the local CLI server.** If Heptabase starts but Codex says the CLI server is not ready, read `references/codex-sandbox.md`; retry `heptabase` commands outside the sandbox when Codex supports escalation.
- **Mutations are serialized.** Write operations run one at a time to prevent conflicts. Reads are concurrent.
- **Request body size limit.** The server rejects request bodies larger than 1 MB.
- **Request timeout.** The server times out requests that take longer than 10 seconds to send their body.

## Known limitations

- **Auto-enabling local server/CLI install not supported.** If the local CLI server is disabled or CLI wiring is missing, the skill cannot repair it by itself; ask the user to enable Local CLI Server and CLI install from desktop settings first.
- **File export is local-file-only.** `heptabase file export` works only when the file metadata and raw file are already available locally in the desktop app. It does not download missing files from cloud storage.
- **Binary/media upload workflows not supported.** This skill can export locally available files and whiteboard PNGs, but it cannot upload files or call media-processing APIs.
- **Whiteboard scope is intentionally bounded.** The CLI cannot delete a whiteboard or underlying Card, move content across spaces, create arbitrary shapes, or perform one semantic whole-board auto-layout command. `remove-objects` removes canvas placements, not source Cards.
- **No CLI undo command or Agent history.** Whiteboard mutations use the app's normal domain actions, but the CLI does not expose Agent chat undo, tool-call persistence, or the Agent screenshot checklist. Read first and verify the result yourself.
- **Whiteboard content is local.** Whiteboard reads use content available in the running desktop app and do not run backend-only PDF, web, or YouTube enrichment. Use dedicated PDF and media commands for full source content. Full web card content is not available through the CLI; use the source URL in the whiteboard output.
- **Screenshots are schematic.** They support spatial review but do not replace semantic reads or deterministic lint.
- **Property filtering not supported yet.** You can read tag property schemas, read property values, and set one property value on a card, but you can't query cards by property value.

## Warnings

- **Use the CLI as the only data access path.** Never directly read, write, or modify Heptabase app data through local database files, app storage, cache files, internal endpoints, or any other non-CLI mechanism. If the CLI does not support the requested operation, stop and report that it is not supported.
