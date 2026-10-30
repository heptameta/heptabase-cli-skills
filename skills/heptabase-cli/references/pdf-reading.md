# PDF Reading

## Common Usage Pattern

1. Find PDF card IDs:

```bash
heptabase card list --card-types pdf --limit 20
heptabase card list -q "<keyword>" --card-types pdf --limit 20
```

2. Read metadata before content:

```bash
heptabase pdf metadata <pdfCardId>
```

3. Read small page ranges:

```bash
heptabase pdf read <pdfCardId> --start-page 1 --end-page 5
```

## Pagination Guidance

- Always call `pdf metadata` first.
- Page numbers are 1-indexed and inclusive.
- Every page in the requested range is returned. Pages with no parsed text or images have `markdown: ""`; image-only pages include image lines with file URIs.
- Read 5-10 pages by default to avoid burning through tokens.
- Ask the user before requesting significantly more than 100 pages.

## When To Use `pdf read` Vs `file export`

- Use `pdf read` for textual analysis. It returns Heptabase's parsed Markdown, ready for the LLM.
- Use `file export` for visual or structural inspection. It returns the raw `.pdf` binary path for native PDF tools. This is rarely needed.

## Read Or Reuse A Parsed Image

Images in the parsed Markdown use file URIs, for example:

```markdown
![](heptabase://pdfCard/<pdfCardId>/file/<fileId>)
```

To inspect the image, create a scratch directory and pass the complete URI to `file export`:

```bash
mktemp -d
heptabase file export "<fileUriFromPdfRead>" --output-dir <scratchDirFromMktemp>
```

Read the returned `path` with your native image-reading tool. Keep the `pdfCard` source in the URI: it lets the CLI find and download a parsed image even when that image has no local file record. See `references/file-reading.md` for export details.

To insert the image into a note through the CLI, import the exported file with `heptabase file import <exportedPath>`, then use the returned `fileId`, `width`, and `height` in the `note read` → `note save` JSON workflow from `references/file-import.md`. Do not paste the file URI image line into `note create` or `note append`, which still take standard Markdown.

## Troubleshooting

- `parsedStatus: "processing"`: wait and retry later.
- `parsedStatus: "failed"` or `"notSupported"`: parsed Markdown is not available for this PDF.
- `parsedStatus: null`: this PDF card is not parsed yet. Ask the user to open the PDF in Heptabase and click the **Parse** button.
