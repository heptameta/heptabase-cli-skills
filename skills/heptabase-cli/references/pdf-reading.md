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
- Empty or image-only pages are returned with `markdown: ""` so the range is continuous.
- Read 5-10 pages by default to avoid burning through tokens.
- Ask the user before requesting significantly more than 100 pages.

## When To Use `pdf read` Vs `file export`

- Use `pdf read` for textual analysis. It returns Heptabase's parsed Markdown, ready for the LLM.
- Use `file export` for visual or structural inspection. It returns the raw `.pdf` binary path for native PDF tools. This is rarely needed.

## Troubleshooting

- `parsedStatus: "processing"`: wait and retry later.
- `parsedStatus: "failed"` or `"notSupported"`: parsed Markdown is not available for this PDF.
- `parsedStatus: null`: this PDF card is not parsed yet. Ask the user to open the PDF in Heptabase and click the **Parse** button.
