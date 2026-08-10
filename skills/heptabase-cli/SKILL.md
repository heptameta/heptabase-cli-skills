---
name: heptabase-cli
description: Use the local heptabase CLI whenever the user mentions Heptabase or shares an app.heptabase.com URL/deep link — read cards, journals, and whiteboards by the ID in the URL instead of opening a browser (agent browsers are not logged in). Supports listing and searching cards, creating and editing notes and journals, tags and properties, reading parsed PDF and audio/video transcript content, exporting local files, managing whiteboard cards, and browsing AI Tutor goals, courses, and lessons.
allowed-tools: Bash(heptabase *) Bash(jq *) Bash(mktemp *)
metadata:
  heptabase-cli-version-range: "0.5.x"
---

## Prerequisites

- CLI installed from the desktop app. The command is `heptabase` on macOS/Linux; Windows installs `heptabase.cmd` for cmd/PowerShell and a `heptabase` shim for POSIX shells.
- Check version compatibility before use with `heptabase --version`. If the installed CLI version is outside this skill's compatibility range (`0.5.x`), you MUST stop and ask the user to update either the Heptabase desktop app or this skill package before continuing.

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
- **Create a note from markdown:** `heptabase note create --content "# Title\n\nBody"` (marks Created by AI by default).
- **Create a human-owned note:** `heptabase note create --no-created-by-ai --content "# Title\n\nBody"`.
- **Create today's journal from markdown:** `heptabase journal create --content "Body"` (marks Created by AI by default).
- **Create a human-owned journal:** `heptabase journal create --no-created-by-ai --content "Body"`.
- **Append markdown to a note:** `heptabase note append <cardId> --content "More content"`.
- **Edit note content with JSON save:** first read `references/card-content-schema.md`, then use `heptabase note read <cardId>`, modify the returned ProseMirror JSON, and save with `heptabase note save <cardId> --content-md5 <contentMd5> --content-file <path>`.
- **List tag properties:** `heptabase tag properties <tagId>`
- **List cards with property values:** `heptabase tag cards <tagId> --include-properties`
- **Read card properties:** `heptabase card properties <cardIdOrDate>`
- **Set card property:** first read `references/property-values.md`, then use `heptabase card set-property <cardIdOrDate> --property-id <propertyId> --value "Published"` for strings/options or `--json-value ...` for typed JSON values.
- **Read parsed PDF content:** first read `references/pdf-reading.md`, then use `heptabase pdf metadata <pdfCardId>` to discover `totalPages`, and read a page range with `heptabase pdf read <pdfCardId> --start-page N --end-page N`.
- **Read transcript content:** first read `references/transcript-reading.md`, then use `heptabase audio metadata <audioCardId>` or `heptabase video metadata <videoCardId>` to discover `transcriptStatus` and `durationSeconds`, and read overlapping transcript entries in a time range with `heptabase audio read <audioCardId> --start-seconds 0 --end-seconds 300` or `heptabase video read <videoCardId> --start-seconds 0 --end-seconds 300`.
- **Read a file from a PDF/media card:** first read `references/file-reading.md`, then use `heptabase file list --card-id <cardId>` to find the right file `id`, run `mktemp -d`, and pass the returned directory path to `heptabase file export <fileId> --output-dir <scratchDir>`. Read the returned `path` with your native file-reading tool.
- **Read a file by `fileId`:** first read `references/file-reading.md`, then run `mktemp -d` and pass the returned directory path to `heptabase file export <fileId> --output-dir <scratchDir>`. Read the returned `path` with your native file-reading tool.
- **List cards on a whiteboard:** `heptabase whiteboard cards <whiteboardId>`
- **Add a card to a whiteboard:** `heptabase whiteboard add-card --whiteboard-id <whiteboardId> --card-id <cardIdOrDate>`

## Heptabase URLs (Deep links)

When the user shares a Heptabase URL (aka. deep link), use the CLI to read it — do NOT open it in a browser if the user does not explicitly ask you to (the app requires authentication and browsers used by agents are typically not logged in).

URL patterns and how to handle them:

- **Journal card:** `https://app.heptabase.com/<workspaceId>/card/<YYYY-MM-DD>` → `heptabase journal read <YYYY-MM-DD>`
- **Card by UUID:** `https://app.heptabase.com/<workspaceId>/card/<uuid>` → first run `heptabase card properties <uuid>` to discover the card type, then read its content with the matching command (`heptabase note read <uuid>`, `heptabase pdf metadata <uuid>`, etc.).
- **Whiteboard:** `https://app.heptabase.com/<workspaceId>/whiteboard/<uuid>` → `heptabase whiteboard cards <uuid>`

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

## All output is JSON

Every command prints JSON to stdout. You can parse it with `jq` or pipe it to other tools.

## Troubleshooting

- **Desktop app must be running.** The CLI communicates with a local server inside the app. If the app is closed, all commands fail. Run `heptabase start` to launch and wait for readiness.
- **Codex sandbox may block the local CLI server.** If Heptabase starts but Codex says the CLI server is not ready, read `references/codex-sandbox.md`; retry `heptabase` commands outside the sandbox when Codex supports escalation.
- **Mutations are serialized.** Write operations (create, save, append, trash, restore, tag add/remove, card set-property, file export, whiteboard add-card/remove-card) run one at a time to prevent conflicts. Reads are concurrent.
- **Request body size limit.** The server rejects request bodies larger than 1 MB.
- **Request timeout.** The server times out requests that take longer than 10 seconds to send their body.

## Known limitations

- **Auto-enabling local server/CLI install not supported.** If the local CLI server is disabled or CLI wiring is missing, the skill cannot repair it by itself; ask the user to enable Local CLI Server and CLI install from desktop settings first.
- **File export is local-file-only.** `heptabase file export` works only when the file metadata and raw file are already available locally in the desktop app. It does not download missing files from cloud storage.
- **Binary/media upload workflows not supported.** This skill is for JSON/text operations on notes/journals/tags/cards and AI Tutor reads, not file upload or media-processing APIs.
- **Whiteboard creation/edit/delete not supported yet.** You can list whiteboards and add, list, or remove cards on them, but you can't create, rename, move, or delete whiteboards.
- **Property filtering not supported yet.** You can read tag property schemas, read property values, and set one property value on a card, but you can't query cards by property value.

## Warnings

- **Use the CLI as the only data access path.** Never directly read, write, or modify Heptabase app data through local database files, app storage, cache files, internal endpoints, or any other non-CLI mechanism. If the CLI does not support the requested operation, stop and report that it is not supported.
