# File Reading

Reads name each Heptabase file by a file URI. Use `heptabase file list` to find the file URIs of a PDF or media card, and `heptabase file export` with a file URI or file ID to copy a local file into a scratch directory so native file-reading tools can inspect it.

To add a local file or a URL to Heptabase instead, read `references/importing.md`.

## Command Summary

```bash
heptabase file list --card-id <pdf-or-media-card-id>
heptabase file export "<fileUri>" --output-dir <existing-directory>
heptabase file export <fileId> --output-dir <existing-directory>
```

- `file list --card-id` returns exportable files for PDF/media cards. Unsupported card types return an empty `files` array.
- `file export` copies a local raw file into `--output-dir` and returns the file path to read. It does not download files from cloud storage.
- Read only the returned `path`; never inspect Heptabase internal file paths.

## File URIs

A file URI names a Heptabase file. It is not a download URL or a local path:

```text
heptabase://<objectType>/<objectId>/file/<fileId>
heptabase://file/<fileId>
```

The first form also names the object the file was read from, such as `card`, `journal` (with a `YYYY-MM-DD` date as its ID), `pdfCard`, `imageCard`, `videoCard`, or `audioCard`. The second form has no source, for example a file that `file import` just created. Copy URIs exactly as a command returned them, and quote them in the shell.

Where you find them:

- `file import` returns `fileUri`.
- `file list` returns a `fileUri` for each file of a PDF or media card.
- `object read` and whiteboard reads show a PDF or media card's file as `file: <fileUri>`, and media inside content as the lines below.

## Media Lines In Reads

`object read` shows images, videos, audio, and attachments inside content as Hepta Markdown lines (IDs below are placeholders):

```markdown
![Diagram](heptabase://card/<cardId>/file/<fileId>){width=60% alignment=left}
<hepta-video src="heptabase://card/<cardId>/file/<fileId>" width="80%"></hepta-video>
<hepta-audio src="heptabase://card/<cardId>/file/<fileId>"></hepta-audio>
<hepta-file src="heptabase://card/<cardId>/file/<fileId>"></hepta-file>
```

- Images use Markdown image syntax; videos, audio, and attachments use the `<hepta-video>`, `<hepta-audio>`, and `<hepta-file>` tags, with an empty body.
- Images and videos can show `width` (a percentage) and `alignment` (`left` or `right`). Default values are left out. Audio and file tags have neither.
- `src` is a file URI, or an `http` or `https` URL for external media such as an embedded YouTube video.
- `pdf read` shows images in parsed pages as signed download URLs, not file URIs.

These lines are a read format. `note create`, `note append`, `journal create`, and `journal append` take standard Markdown and do not accept them; `note save` and `journal save` take ProseMirror JSON, where media nodes use the bare `fileId`. To put an image in a note, follow `references/importing.md`.

## List Files

If you have a PDF or media card ID, list its files first:

```bash
heptabase file list --card-id 22222222-2222-4222-8222-222222222222
```

Example response:

```json
{
  "cardId": "22222222-2222-4222-8222-222222222222",
  "cardType": "pdf",
  "files": [
    {
      "id": "55555555-5555-4555-8555-555555555555",
      "fileUri": "heptabase://pdfCard/22222222-2222-4222-8222-222222222222/file/55555555-5555-4555-8555-555555555555",
      "purpose": "content",
      "name": "report.pdf",
      "mimeType": "application/pdf",
      "size": 123456,
      "lastEditedTime": "2026-05-02T00:00:00.000Z"
    }
  ]
}
```

Pick the file whose `purpose` you need (`content`, or `cover` for a media card's cover image), then pass its `fileUri` to `file export`. The bare `id` works too.

## Export And Read

1. Create a scratch directory:

```bash
mktemp -d
```

Copy the returned directory path for the next command.

2. Export the file:

```bash
heptabase file export "heptabase://pdfCard/22222222-2222-4222-8222-222222222222/file/55555555-5555-4555-8555-555555555555" --output-dir <scratchDirFromMktemp>
```

3. Parse the JSON response and read the returned `path` with your native file-reading tool.

Example response:

```json
{
  "fileId": "55555555-5555-4555-8555-555555555555",
  "path": "/tmp/hepta-read/report-55555555-5555-4555-8555-555555555555.pdf",
  "filename": "report-55555555-5555-4555-8555-555555555555.pdf",
  "originalName": "report.pdf",
  "mimeType": "application/pdf",
  "size": 123456,
  "lastEditedTime": "2026-05-02T00:00:00.000Z"
}
```

Now read `/tmp/hepta-read/report-55555555-5555-4555-8555-555555555555.pdf` with your native file-reading tool.

## Avoid Reading Huge Files Blindly

- Check `size`, `mimeType`, and `name` before reading.
- For textual PDF reads, prefer `references/pdf-reading.md` and `heptabase pdf read` over exporting the raw PDF.
- If the file is large, ask the user before reading the whole file or use targeted extraction, search, or page reads to avoid wasting tokens.

## Clean Up Scratch Files

- Exported files are temporary scratch copies. After you finish reading them, delete the scratch directory created by `mktemp -d`.
- Do not delete the scratch directory until all tools that need the returned `path` are done.

## Troubleshooting

- `file list --card-id` returns empty `files`: this card has no exportable local file. If the user expected a PDF/media file, ask them to verify the card.
- `file export` says the file is unavailable locally: ask the user to open/sync the file in Heptabase, then retry.
- `<fileUriOrId> must be a file URI or file ID UUID`: pass the URI exactly as a command returned it.
- Invalid or missing `--output-dir`: create a scratch directory with `mktemp -d` and retry.
