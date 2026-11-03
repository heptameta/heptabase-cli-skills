---
name: heptabase-cli
description: Use the local heptabase CLI whenever the user mentions Heptabase or shares an app.heptabase.com URL/deep link. Read and edit notes, journals, and properties; list, query, create, and edit tags and tag databases; read chats, messages, files, highlights, and backlinks; go through and organize the Inbox; import local files and URLs, save PDF, image, audio, video, YouTube, and web page cards, and parse PDFs; and work with whiteboard structure and layout through the running desktop app, including sections, connections, mind maps, lint, and schematic screenshots. Also browse AI Tutor goals, courses, and lessons. Do not open Heptabase links in an agent browser unless the user asks.
allowed-tools: Bash(heptabase *) Bash(jq *) Bash(mktemp *)
metadata:
  heptabase-cli-version-range: "0.9.x"
---

## Prerequisites

- CLI installed from the desktop app. The command is `heptabase` on macOS/Linux; Windows installs `heptabase.cmd` for cmd/PowerShell and a `heptabase` shim for POSIX shells.
- Check version compatibility before use with `heptabase --version`. If the installed CLI version is outside this skill's compatibility range (`0.9.x`), you MUST stop and ask the user to update either the Heptabase desktop app or this skill package before continuing.

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
- **List tags:** `heptabase tag list` returns the tag tree as `{ content }` text with each tag's ID and card count. Narrow it with `--name-filter <text>`, or list one branch with `--parent-tag-id <tagId>`.
- **Find cards by property value, or change a tag database:** first read `references/tag-databases.md`, then run `heptabase tag query <tagId> --fields "title,<propertyId>" --filter <json>`, or `heptabase tag edit <tagId> --edits <path|->` to add properties, options, and views.
- **Find what links to an object:** `heptabase object backlinks <objectType> <objectId>` lists the cards, journals, and whiteboards that link to, mention, or place it, as `{ content }` text. Types: `card`, `pdfCard`, `journal` (ID `YYYY-MM-DD`), `highlightElement`, `imageCard`, `videoCard`, `audioCard`, `webCard`, `whiteboard`. Page with `--offset` and `--limit` (default 20, max 50); the text names the next offset.
- **Go through the Inbox:** `heptabase inbox list` returns the All tab as `{ content }` text with each item's inbox item ID. Narrow it with `--unread`, `--kinds card`, or `--states later,done`, and page with `--offset` and `--limit` (default 20, max 100). Before adding, updating, or removing items, read the Inbox section below.
- **Read highlights:** `heptabase card highlights <cardId>` reads the highlights on a note card or PDF card, with each highlight's note, as `{ content }` text. Page with `--offset` and `--limit` (default 30, max 50).
- **Read parsed PDF content:** first read `references/pdf-reading.md`, then use `heptabase pdf metadata <pdfCardId>` to discover `parsedStatus` and `totalPages`. If `parsedStatus` is not `"success"`, run `heptabase pdf parse <pdfCardId>` until it is. Then read a page range with `heptabase pdf read <pdfCardId> --start-page N --end-page N`.
- **Read transcript content:** first read `references/transcript-reading.md`, then use `heptabase audio metadata <audioCardId>` or `heptabase video metadata <videoCardId>` to discover `transcriptStatus` and `durationSeconds`, and read overlapping transcript entries in a time range with `heptabase audio read <audioCardId> --start-seconds 0 --end-seconds 300` or `heptabase video read <videoCardId> --start-seconds 0 --end-seconds 300`.
- **Read an attached file:** first read `references/file-reading.md`. If needed, find its `fileUri` with `heptabase file list --card-id <cardId>`, then run `mktemp -d` and `heptabase file export "<fileUri>" --output-dir <scratchDir>`. Read the returned `path` with your native file-reading tool.
- **Save a file, web page, or video to Heptabase:** first read `references/importing.md`. For a local file or a URL that serves a file, run `heptabase file import <path>` or `heptabase file import --url <url>`, then the `create` command for the returned `fileKind`, for example `heptabase pdf create --file-uri "<fileUri>"`. For a web page, run `heptabase web create --url <url>`; for a YouTube video, `heptabase video create --url <url>`.
- **Add a local image to a note:** first read `references/importing.md`, then run `heptabase file import <path>` and append the returned `fileUri` as an image line: `heptabase note append <cardId> --content '![Diagram](<fileUri>)'`.
- **Inspect a whiteboard:** `heptabase whiteboard read <whiteboardId> --mode structure`, then `heptabase whiteboard read-layout <whiteboardId>`.
- **Read chat messages:** Copy a chat ID from `whiteboard read` output, then use `heptabase object read chat <chatId> --offset <n> --limit <n>` to paginate non-removed messages with their displayed author, timestamp, quoted content, and message content. For a whiteboard chat-messages element, use `heptabase object read chatMessagesElement <elementId> --offset <n> --limit <n>`.
- **Check or view whiteboard layout:** run `heptabase whiteboard lint <whiteboardId>`. For visual review, first read `references/whiteboard.md`, then use `heptabase whiteboard screenshot <whiteboardId> --output <existingDirectory>/whiteboard.png` and inspect the returned local path.
- **Change whiteboard layout or a mind map:** first read `references/whiteboard.md`; for mind maps, also read `references/mind-maps.md`. Commands with nested or batch input use `--input <path|->` and canonical JSON.

## Heptabase URLs (Deep links)

When the user shares a Heptabase URL (aka. deep link), use the CLI to read it — do NOT open it in a browser if the user does not explicitly ask you to (the app requires authentication and browsers used by agents are typically not logged in).

URL patterns and how to handle them:

- **Journal card:** `https://app.heptabase.com/<workspaceId>/card/<YYYY-MM-DD>` → `heptabase journal read <YYYY-MM-DD>`
- **Card by UUID:** `https://app.heptabase.com/<workspaceId>/card/<uuid>` → first run `heptabase card properties <uuid>` to discover the card type, then read its content with the matching command (`heptabase note read <uuid>`, `heptabase pdf metadata <uuid>`, `heptabase object read webCard <uuid>`, etc.).
- **Whiteboard:** `https://app.heptabase.com/<workspaceId>/whiteboard/<uuid>` → run `heptabase whiteboard read <uuid> --mode structure` and `heptabase whiteboard read-layout <uuid>`. Read `references/whiteboard.md` before any layout mutation or visual judgment.

The `<workspaceId>` segment in the URL is not needed by the CLI — extract only the card/whiteboard ID.

## Note and journal card content editing

`note create`, `note append`, `journal create`, and `journal append` take Hepta Markdown: ordinary Markdown plus Heptabase tags for mentions, embeds, media, and colors. It is the format `object read` returns, so content you read there can be written back once its line-number prefixes are stripped.

`note save` and `journal save` take ProseMirror JSON. Before calling either, you MUST read `references/card-content-schema.md`. Also read it before writing Hepta Markdown beyond plain formatting, such as mentions, embeds, images, videos, math, tables, toggle/todo lists, or colors.

## Created by AI marking

`note create` and `journal create` mark content as Created by AI by default. `tag create` and the commands that make cards from files and URLs (`pdf`, `image`, `audio`, `video`, and `web create`) always mark what they create. Before deciding whether to pass `--no-created-by-ai`, or before creating a tag or card the user wants as their own, you MUST read `references/created-by-ai.md`.

## Property editing

Before setting a property value, you MUST read `references/property-values.md` and inspect the target property with `heptabase card properties <cardIdOrDate>` and/or `heptabase tag properties <tagId>`. Property formats vary by type, and relation writes replace the full relation value. For relation properties, use `heptabase tag properties <sourceTagId>` to get the property definition's `relationTargetTagId`, then list valid related cards before writing. To find cards by property value, use `tag query` (see `references/tag-databases.md`).

## Tags and tag databases

Before querying a tag database, creating a tag, editing a tag database's properties, options, or views, or organizing tags into groups and parents, you MUST read `references/tag-databases.md`. `tag create` returns two IDs: use `tagId`, not `id`, with the other `tag` commands.

## File reading

Before reading/listing files, exporting a file, or interpreting file URIs and media lines from `object read`, you MUST read `references/file-reading.md`.

## Importing files and URLs

Before importing a file or URL, making a card from a file, saving a web page or YouTube video, or adding an image to a note, you MUST read `references/importing.md`.

## PDF reading

Before parsing a PDF or reading parsed PDF content, you MUST read `references/pdf-reading.md`.

## Transcript reading

Before reading parsed media transcripts, you MUST read `references/transcript-reading.md`.

## Whiteboard work

Before deliberate placement, movement, arrangement, resizing, sectioning, connection work, removal, or visual verification, you MUST read `references/whiteboard.md`. It defines exact placement references, selection and destination shapes, read-before-write rules, and the verification loop.

For mind-map creation or structural edits, also read `references/mind-maps.md`. Read the current mind map again before updating it so stable structural node IDs are current.

The existing `whiteboard cards`, `add-card`, and `remove-card` commands are narrow legacy commands. Prefer `whiteboard read`, `read-layout`, and the canonical `--input` commands for structured whiteboard work.

The canonical mutation commands cover whiteboard hierarchy and shortcuts; object placement and cross-whiteboard moves; move, arrange, align, resize, color, and removal; Sections and connections; and mind-map creation and updates. Run `heptabase whiteboard --help` for the current list and read the linked references for nested input.

## Inbox

The Inbox holds the cards and chat messages the user added, and the mentions, replies, quotes, and invites they received. Creating a card never puts it there; use `inbox add` only when the user wants a card in their Inbox.

- `inbox list` lists the All tab (`--states active`) by default. `later` holds items reminded for a date after today, and `done` the finished ones. To check whether cards are in the Inbox, pass `--card-ids <ids>` with `--states active,later,done`.
- `inbox add <cardIds...>` works like the app's Add to Inbox and needs a subscription. A card already in the Inbox moves back to the top and out of Done. `--remind-date YYYY-MM-DD` (the user's local date, after today) keeps it in Later until then; without it, an earlier remind date is cleared. Journals cannot be added.
- `inbox update <inboxItemIds...>` takes `--status done|read|unread`, `--remind-date YYYY-MM-DD` or `--clear-remind-date`, or a status and a date together. `unread` also moves a done item back to the top. Marking a card done does not file it: when the user is processing their Inbox, place the card on a whiteboard or tag it first.
- `inbox remove <inboxItemIds...>` removes only items the user added; the cards and messages stay. Mark mentions, replies, quotes, and invites done instead.

`inbox update` and `inbox remove` take inbox item IDs from `inbox list`, not card IDs. The commands have no undo, so list first and change only what the user asked for. Each prints `{ content }` text and exits non-zero when the request fails or every item failed; when it exits `0`, read the text for items that failed.

## Canonical JSON input

Commands with nested or batch data accept `--input <path|->`; `-` reads JSON from stdin. `tag edit` takes its edits array the same way, with `--edits <path|->`. Build JSON with `jq` or write it to a temporary file. Do not interpolate untrusted text into hand-built shell JSON.

Inspect every mutation result. A handled top-level `status: "failed"` is printed and exits with status `1`. A successful top-level result exits with `0` even when item results contain `failureReasonCode` fields, so check them before reporting full success.

## All output is JSON

Every command prints its result as JSON to stdout, including a handled `status: "failed"` result. You can parse it with `jq` or pipe it to other tools. Errors are printed as JSON to stderr, with an `error` field that is a message or `{ code, message, retryable }`, and the command exits with status `1`. Some commands, such as `tag list`, `tag query`, `object backlinks`, `card highlights`, and the `inbox` commands, return a `content` string written for you to read; do not parse it. `whiteboard screenshot` writes the PNG to `--output` and prints metadata only; it never prints image bytes.

## Troubleshooting

- **Desktop app must be running.** The CLI communicates with a local server inside the app. If the app is closed, all commands fail. Run `heptabase start` to launch and wait for readiness.
- **Codex sandbox may block the local CLI server.** If Heptabase starts but Codex says the CLI server is not ready, read `references/codex-sandbox.md`; retry `heptabase` commands outside the sandbox when Codex supports escalation.
- **Mutations are serialized.** Write operations run one at a time to prevent conflicts. Reads are concurrent.
- **Request body size limit.** The server rejects JSON request bodies larger than 1 MB. `file import` uploads can be up to 2000 MB.
- **Request timeout.** The server times out JSON requests that take longer than 10 seconds to send their body.

## Known limitations

- **Auto-enabling local server/CLI install not supported.** If the local CLI server is disabled or CLI wiring is missing, the skill cannot repair it by itself; ask the user to enable Local CLI Server and CLI install from desktop settings first.
- **File export is local-file-only.** `heptabase file export` works only when the file metadata and raw file are already available locally in the desktop app. It does not download missing files from cloud storage.
- **Cards from files are not transcribed.** `audio create` and `video create --file-uri` do not transcribe the audio or video; ask the user to do that in the app.
- **Some files cannot become cards.** Files that import as `fileKind: "file"`, including HEIC, HEIF, and TIFF photos and web pages imported with `file import --url`, have no card type. Convert photos to JPEG or PNG first, and save web pages with `web create`.
- **Imported files cannot be deleted.** The CLI has no command to delete a file that `file import` added. Import only what you will use.
- **Whiteboard scope is intentionally bounded.** The CLI cannot delete a whiteboard or underlying Card, move content across spaces, create arbitrary shapes, or perform one semantic whole-board auto-layout command. `remove-objects` removes canvas placements, not source Cards.
- **No CLI undo command or Agent history.** Whiteboard mutations use the app's normal domain actions, but the CLI does not expose Agent chat undo, tool-call persistence, or the Agent screenshot checklist. Read first and verify the result yourself.
- **Whiteboard content is local.** Whiteboard reads use content available in the running desktop app and do not run backend-only PDF, web, or YouTube enrichment. Use dedicated PDF and media commands, and `object read webCard <webCardId>` for a web card, for full source content.
- **Screenshots are schematic.** They support spatial review but do not replace semantic reads or deterministic lint.
- **Tag database edits only add and change.** `tag edit` cannot delete a tag, property, option, or view.

## Warnings

- **Use the CLI as the only data access path.** Never directly read, write, or modify Heptabase app data through local database files, app storage, cache files, internal endpoints, or any other non-CLI mechanism. If the CLI does not support the requested operation, stop and report that it is not supported.
