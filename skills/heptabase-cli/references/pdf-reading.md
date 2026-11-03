# PDF Reading

## Common Usage Pattern

1. Find PDF card IDs:

```bash
heptabase card list --card-types pdf --limit 20
heptabase card list -q "<keyword>" --card-types pdf --limit 20
```

To read a PDF that is not in Heptabase yet, import it and make a PDF card first (see `references/importing.md`).

2. Read metadata before content:

```bash
heptabase pdf metadata <pdfCardId>
```

3. If `parsedStatus` is not `"success"`, parse the PDF (see [Parse A PDF](#parse-a-pdf)).

4. Read small page ranges:

```bash
heptabase pdf read <pdfCardId> --start-page 1 --end-page 5
```

## Parse A PDF

`pdf read` works only after Heptabase has parsed the PDF. `pdf parse` starts parsing in the background, or checks a parse that is already running:

```bash
heptabase pdf parse <pdfCardId>
```

```json
{
  "parsedStatus": "processing",
  "estimatedRemainingTimeSeconds": 90
}
```

- `parsedStatus` is `"processing"` or `"success"`. `estimatedRemainingTimeSeconds` is `null` when no estimate is known.
- While it is `"processing"`, wait about `estimatedRemainingTimeSeconds` (30 seconds when it is `null`), then run the same command again. A repeated run collects the result and never starts a second parse. Long PDFs can take a few minutes.
- At `"success"`, run `pdf metadata` for `totalPages`, then `pdf read`.
- A PDF that is already parsed returns `"success"` at once and is not parsed again.
- Tell the user when you start parsing a long PDF, so they know why you are waiting.

`pdf parse` exits with status `1` and prints an `error` when:

<!-- prettier-ignore -->
| Error | What to do |
|---|---|
| The PDF card is not found | Check the card ID; a trashed card is not found |
| The account can only view the card | Ask the card's owner to parse it |
| The PDF is over 3,000 pages or 350 MB | Heptabase cannot parse it. Use `file export` and a native PDF tool if the user agrees |
| Heptabase cannot parse this PDF, for example because it is encrypted | The same |
| The PDF has not finished uploading | A just-imported PDF uploads in the background. Wait a minute, then run `pdf parse` again |
| Parsing failed | Running `pdf parse` again starts parsing again. Retry once, then tell the user |

## Pagination Guidance

- Always call `pdf metadata` first.
- Page numbers are 1-indexed and inclusive.
- Empty or image-only pages are returned with `markdown: ""` so the range is continuous.
- Read 5-10 pages by default to avoid burning through tokens.
- Ask the user before requesting significantly more than 100 pages.

## When To Use `pdf read` Vs `file export`

- Use `pdf read` for textual analysis. It returns Heptabase's parsed Markdown, ready for the LLM. Images in the parsed pages are signed download URLs, not file URIs.
- Use `file export` for visual or structural inspection. It returns the raw `.pdf` binary path for native PDF tools. This is rarely needed.

## Troubleshooting

- `pdf read` fails with `PDF parsed content is not ready`: the error names the current `parsedStatus`; run `pdf parse`.
- `parsedStatus: null` or `"failed"` in `pdf metadata`: run `pdf parse` to start parsing.
- `parsedStatus: "processing"`: run `pdf parse` to check progress and collect the result.
- `parsedStatus: "notSupported"`: Heptabase cannot parse this PDF; `pdf parse` fails too.
