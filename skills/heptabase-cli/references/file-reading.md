# File Reading

Use `heptabase file list` to find file URIs for a PDF/media card. Use `heptabase file export` with a file URI or file ID to copy a file into a scratch directory so native file-reading tools can inspect it.

To add a local file or a URL to Heptabase instead, read `references/file-import.md`.

## Command Summary

```bash
heptabase file list --card-id <pdf-or-media-card-id>
heptabase file export "<fileUri>" --output-dir <existing-directory>
heptabase file export <fileId> --output-dir <existing-directory>
```

- `file list --card-id` returns exportable files for PDF/media cards. Unsupported card types return an empty `files` array.
- `file export` copies a local raw file into `--output-dir` and returns the file path to read. For a parsed PDF image with no local bytes, it downloads the image using the PDF source in the URI.
- Read only the returned `path`; never inspect Heptabase internal file paths.

## File URIs And Media Lines

A file URI identifies a Heptabase file. It is not an HTTP download URL or a local path:

```text
heptabase://<objectType>/<objectId>/file/<fileId>
heptabase://file/<fileId>
```

The first form includes the object where the file was read. The second has no source, for example a newly imported file. Copy the URI returned by `object read`, `pdf read`, `file list`, or `file import`; preserve its object type and source ID. A journal source uses a `YYYY-MM-DD` date. Media card sources use `imageCard`, `videoCard`, or `audioCard`; a PDF source uses `pdfCard`.

`object read` presents media in Hepta Markdown. For example (IDs below are placeholders):

```markdown
![Diagram](heptabase://card/<cardId>/file/<fileId>){width=60% alignment=left}
![](https://example.com/diagram.png)
<hepta-video src="heptabase://card/<cardId>/file/<fileId>" width="80%">lecture.mp4</hepta-video>
<hepta-audio src="heptabase://card/<cardId>/file/<fileId>">interview.m4a</hepta-audio>
<hepta-file src="heptabase://card/<cardId>/file/<fileId>">report.pdf</hepta-file>
<hepta-embed type="card" id="<cardId>" width="60%" alignment="right">Related note</hepta-embed>
```

Each media block occupies its own line. Images, videos, and embeds can show `width` and `alignment`; audio and file blocks do not. Width is a percentage from 20% to 100%, rounded to 10% steps; alignment is `left`, `center`, or `right`. Default layout values are omitted.

Each of `<hepta-video>`, `<hepta-audio>`, and `<hepta-file>` identifies its node type without a `type` attribute. `width` and `alignment` are invalid on `<hepta-audio>` and `<hepta-file>`. The text inside these three tags is the filename, and may be empty. Media card and PDF headings use `file: <fileUri>`.

These are read formats. CLI `note create/append` and `journal create/append` still take standard Markdown, so do not paste these media lines into them. `note save` and `journal save` take ProseMirror JSON. To insert an image in a note, use the file's `fileId` in an image node as described in `references/file-import.md`.

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

Pick the file whose `purpose` you need, then pass its `fileUri` to `file export`. A bare `id` also works for a regular local file.

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
- `file export` says a regular file is unavailable locally: ask the user to open/sync the file in Heptabase, then retry. For a parsed PDF image, use the full URI from `pdf read`; a source-free URI or bare ID cannot locate an image that is absent locally.
- Invalid or missing `--output-dir`: create a scratch directory with `mktemp -d` and retry.
