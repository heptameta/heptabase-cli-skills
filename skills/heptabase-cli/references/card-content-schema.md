# Card Content Schema

This reference covers note and journal content writes through the Heptabase CLI.

Read this before generating ProseMirror JSON: the card content schema is strict, and guessed structures can fail validation or damage card content.

Use Hepta Markdown with `note create`, `note append`, `journal create`, and `journal append` for ordinary writing and appending, including mentions, media, and colors. `note save` and `journal save` take ProseMirror JSON. Use ProseMirror JSON only when you need to preserve existing structure, insert content in the middle of a note, or create schema nodes/marks that Hepta Markdown cannot express.

## Top-Level JSON Shape

A ProseMirror document is a JSON object:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "attrs": { "id": null },
      "content": [{ "type": "text", "text": "Hello" }]
    }
  ]
}
```

The `text` node is special: put the characters in a `text` property (not in `attrs`), and put optional formatting in a `marks` array on the same object. See [Marks](#marks) and [Paragraph With Marks And Link](#paragraph-with-marks-and-link).

The document must contain at least one block. `{"type":"doc","content":[]}` is invalid.

When editing existing content, preserve existing `id` values from `read`. For new blocks, omit `id` or set it to `null`; the CLI save handler backfills valid IDs. Do not create custom string IDs yourself.

## Hepta Markdown Content

The `create` and `append` commands take Hepta Markdown: ordinary Markdown plus the Heptabase tags below. It is the format `object read` returns, so content you read there can be written back. Strip the `<lineNumber>\t` prefix from every line first; the CLI writes it as text.

The table below maps Hepta Markdown syntax to the ProseMirror nodes and marks the CLI creates:

<!-- prettier-ignore -->
| Hepta Markdown | ProseMirror result |
| --- | --- |
| `# H1` through `###### H6` | `heading` |
| Plain text paragraphs | `paragraph` |
| `>` quote | `blockquote` |
| `- item` | `bullet_list_item` |
| `1. item` | `numbered_list_item` |
| `- [ ] item`, `- [x] item` | `todo_list_item` |
| `+ item` | `toggle_list_item` |
| Triple backtick fences | `code_block` |
| `---` | `horizontal_rule` |
| GFM pipe tables | `table`, with the header row on |
| `$x$` | `math_inline` |
| `$$` on its own line, the formula, then `$$` on its own line | `math_display` |
| `**bold**`, `*italic*`, `~~strike~~`, `` `code` ``, `[link](url)` | marks |
| `<hepta-mention type="card" id="<cardId>">Card title</hepta-mention>` | inline mention |
| `<hepta-embed type="card" id="<cardId>">Card title</hepta-embed>` | `embed` block |
| `![alt](<fileUri or URL>){width=60% alignment=left}` | `image` block |
| `<hepta-video src="<fileUri or URL>" width="60%" alignment="left"></hepta-video>` | `video` block |
| `<hepta-audio src="<fileUri or URL>"></hepta-audio>` | `audio` block |
| `<hepta-file src="<fileUri or URL>"></hepta-file>` | `file` block |
| `<hepta-color type="text" color="blue">text</hepta-color>` | `color` mark (`type="background"` for a background color) |

Below is an example with inline mentions, an imported image, a YouTube video, display math, and a todo item:

```markdown
# Sprint notes

Discussed in <hepta-mention type="card" id="11111111-1111-4111-8111-111111111111">Sprint plan</hepta-mention> on <hepta-mention type="journal" id="2026-06-04">2026-06-04</hepta-mention>.

![Architecture diagram](heptabase://file/33333333-3333-4333-8333-333333333333){width=60% alignment=left}

<hepta-video src="https://www.youtube.com/watch?v=example"></hepta-video>

$$
E = mc^2
$$

- [ ] Summarize the recording
```

### Mentions And Embeds

- Mention types: `card`, `journal`, `whiteboard`, `pdfCard`, `section`, `tag`, `highlightElement`, `imageCard`, `videoCard`, `audioCard`, `webCard`, and `chat`. A `journal` mention's `id` is its date, `YYYY-MM-DD`.
- Embed types: `card`, `journal`, `highlightElement`, `imageCard`, `videoCard`, and `audioCard`.
- Take every ID from a CLI read, list, or command result. Use the object's full title as the tag text.
- A mention of one block (with a `line` attribute) is not supported here and is written as plain text. Mention the whole object.
- Use `<hepta-mention>` for references to Heptabase objects. A Markdown link to a `heptabase://` URL stays an ordinary link.

### Media

- Put each media line on its own line. An image inside a sentence is dropped, and a media tag inside a sentence is written as text.
- `src` is a file URI from `file import`, `file list`, or a read, or an `http` or `https` URL for external media such as a YouTube video. Copy file URIs unchanged: the CLI does not check them, and a wrong one leaves a broken image. Any other `src` is written as text.
- Images use `{width=… alignment=…}` after the image; videos use `width` and `alignment` attributes on the tag. `width` is a percentage and `alignment` is `left`, `center`, or `right`. Audio and file tags take neither.
- An image written this way has no `originalWidth` or `originalHeight`. The desktop app fills them in the first time it shows the image, which changes the note's `contentMd5`, so read the note again before a `save` or an `append --content-md5`.

### Colors And Protected Content

- Add color only when the user asks for it. Colors: `gray`, `brown`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, and `red`.
- Never write `<hepta-highlight>`; it carries existing highlight data.
- `object read` shows content that Hepta Markdown cannot express as protected regions: `<hepta-placeholder … />`, `<hepta-bookmark>…</hepta-bookmark>`, and complex `<hepta-table>…</hepta-table>` regions. `create` and `append` reject content that contains one with `invalidInput`. To keep such content, edit the ProseMirror JSON from `note read` or `journal read` with `save`.

## ProseMirror Nodes

### Blocks

<!-- prettier-ignore -->
| Node | Content | Attrs |
| --- | --- | --- |
| `doc` | `block+` | none |
| `paragraph` | `inline*` | `id?: UUID string or null` |
| `heading` | `inline*` | `id?: UUID string or null`, `level?: 1-6` (default `1`) |
| `blockquote` | `block+` | `id?: UUID string or null` |
| `horizontal_rule` | none | `id?: UUID string or null` |
| `code_block` | `text*` | `id?: UUID string or null`, `params?: string or null` (see [Code Block Params](#code-block-params); default `""`) |
| `math_display` | `text*` | `id?: UUID string or null` |
| `bullet_list_item` | `paragraph block*` | `id?: UUID string or null`, `folded?: boolean`, `format?: 0, 1, 2, "0", "1", "2", or null` |
| `numbered_list_item` | `paragraph block*` | `id?: UUID string or null`, `order?: positive integer or null`, `format?: 0, 1, 2, "0", "1", "2", or null` |
| `todo_list_item` | `paragraph block*` | `id?: UUID string or null`, `checked?: boolean`, `dueDate?: YYYY-MM-DD string or null`, `lastCheckedTime?: ISO 8601 string or null`, `lastUpdatedTime?: ISO 8601 string` (see [Timestamp Attrs](#timestamp-attrs)) |
| `toggle_list_item` | `heading` or `paragraph`, then `block*` | `id?: UUID string or null`, `folded?: boolean` |
| `table` | `table_row+` | `id?: UUID string or null`, `hasRowHeader?: boolean`, `hasColumnHeader?: boolean` |
| `table_row` | zero or more `table_cell` or `table_header` nodes | `id?: UUID string or null` |
| `table_cell`, `table_header` | `block+` | `id?: UUID string or null`, `colspan?: positive integer`, `rowspan?: positive integer`, `colwidth?: positive integer[] or null`, `backgroundColor?: editor color or null`, `textColor?: editor color or null` (see [Editor Colors](#editor-colors)) |
| `image` | none | `id?: UUID string or null`, `src?: string or null`, `fileId?: UUID string or null`, `width?: string or null`, `originalHeight?: number or null`, `originalWidth?: number or null`, `alignment?: left, center, or right`, `reference?: media reference or null` (preserve from `read`; do not create manually); **legacy markdown:** `alt`, `title` |
| `video` | none | `id?: UUID string or null`, `fileId?: UUID string or null`, `url?: string or null`, `width?: string or null`, `alignment?: left, center, or right`, `originalWidth?: number or null`, `originalHeight?: number or null`, `reference?: media reference or null` (preserve from `read`; do not create manually); **deprecated:** `source` (legacy iframe embeds; omit on new content) |
| `audio` | none | `id?: UUID string or null`, `url?: string or null`, `fileId?: UUID string or null`, `reference?: media reference or null` (preserve from `read`; do not create manually) |
| `file` | none | `id?: UUID string or null`, `fileId?: UUID string or null`, `url?: string or null`, `reference?: media reference or null` (preserve from `read`; do not create manually) |
| `bookmark` | none | `url: full URL string`, `id?: UUID string or null`, `title?: string or null`, `description?: string or null`, `thumbnailUrl?: string or null`, `faviconUrl?: string or null`, `siteName?: string or null`, `lastUpdatedTime?: ISO 8601 string or null` (see [Timestamp Attrs](#timestamp-attrs)) |
| `embed` | none | supported `objectType`: `note`, `journal`, `highlightElement`, `image`, `video`, or `audio`; `objectId: UUID string` (or `YYYY-MM-DD` when `objectType` is `journal`), `id?: UUID string or null`; `originalWidth`, `originalHeight`, `width`, and `alignment` |
| `mention` | none | supported `objectType`: `note`, `journal`, `highlightElement`, `image`, `video`, or `audio`; `objectId: UUID string` (or `YYYY-MM-DD` when `objectType` is `journal`), `id?: UUID string or null` |

Block media nodes cannot appear inside a paragraph. Use inline mention nodes for inline references.

#### Code Block Params

Code block `params` are serialized as `[!]<language>[:displayMode]`, where `!` enables line wrapping and `displayMode` applies to Mermaid blocks (`code`, `preview`, or `split`). See [Code Block](#code-block).

#### Timestamp Attrs

Use ISO 8601 strings for timestamp attrs, for example `2026-05-26T00:00:00.000Z`.

#### Media References

Media `reference` attrs are internal metadata. Preserve them when editing existing JSON from `read`, but do not create them manually. If present, the value must be either `null` or an object with `objectType` and `objectId`. Supported `objectType` values are `card`, `textElement`, `journal`, `highlightElement`, `mediaElement`, `mediaCard`, `pdfCard`, `insight`, `chatMessage`, `chat2AccountRelation`, and `webCard`. `objectId` must be a UUID string, except `journal` references use a `YYYY-MM-DD` date string.

#### Editor Colors

Editor colors for `table_cell` / `table_header` `backgroundColor` and `textColor` are `gray`, `brown`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, and `red`.

### Inline Nodes

<!-- prettier-ignore -->
| Node | Attrs |
| --- | --- |
| `text` | none |
| `math_inline` | none |
| `hard_break` | none |
| `web` | `url: full URL string`, `title?: string or null` |
| `date` | `date: string` (`YYYY-MM-DD`) |
| `whiteboard` | `whiteboardId: UUID string` |
| `card` | `cardId: UUID string` |
| `pdf_card` | `pdfCardId: UUID string` |
| `section` | `sectionId: UUID string` |
| `tag` | `tagId: UUID string` |
| `highlight_element` | `highlightElementId: UUID string` |
| `image_card`, `video_card`, `audio_card` | `cardId: UUID string` |
| `web_card` | `webCardId: UUID string` |
| `chat` | `chatId: UUID string`, `chatMessageId?: UUID string or null`, `quotedChatMessageId?: UUID string or null` |

- **`text`** — Put characters in `text` (required) and optional formatting in `marks`. See [Top-Level JSON Shape](#top-level-json-shape) and [Marks](#marks).
- **`math_inline`** — Put the TeX inside `content` as a child `text` node. See [Math](#math).
- **`people`** — Do not use `people`. It exists in a special editor schema, but the CLI save schema rejects it.

### Marks

Marks only attach to `text` nodes. Each mark is an entry in that node's `marks` array: `{ "type": "<mark>", "attrs": ... }` (many marks have no `attrs`).

When you save as Markdown, you can get bold, italic, and stuff from the syntax in [Markdown Content](#markdown-content). But you cannot get underline or text/background color that way because there is no Markdown syntax for them — save as JSON (ProseMirror) if you need those marks.

<!-- prettier-ignore -->
| Mark | Attrs | Notes |
| --- | --- | --- |
| `em` | none | italic |
| `strong` | none | bold |
| `strike` | none | strikethrough |
| `underline` | none | underline |
| `code` | none | inline code |
| `link` | `href: non-empty string` | `href` is required; **deprecated (legacy markdown):** `title`, `data-internal-href`, `edited` — preserve from `read` if present, do not set on new links |
| `color` | `type: text or background`, `color: gray, brown, orange, yellow, green, blue, purple, pink, or red` | both attrs are required when the mark is present |
| `highlight` | `ids: UUID string[]` | read-only highlight/comment metadata; do not create manually |
| `anchor` | `ids: UUID string[]` | read-only anchor metadata; do not create manually |

### Deprecated attributes

Some attrs remain in the schema as legacy. When **creating** new JSON, omit them unless you are round-tripping an existing document from `read`:

<!-- prettier-ignore -->
| Node or mark | Deprecated attrs | Notes |
| --- | --- | --- |
| `image` | `alt`, `title` | Use `fileId` / `src` and `alignment` instead |
| `video` | `source` | Legacy iframe `data-source`; use `fileId` or `url` |
| `link` | `title`, `data-internal-href`, `edited` | Use `href` only for new external links; internal links are resolved by the app |

## Examples

### Minimal Note

```json
{
  "type": "doc",
  "content": [{ "type": "heading", "attrs": { "level": 1, "id": null } }]
}
```

### Paragraph With Marks And Link

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "attrs": { "id": null },
      "content": [
        { "type": "text", "text": "This is " },
        { "type": "text", "marks": [{ "type": "strong" }], "text": "bold" },
        { "type": "text", "text": " and " },
        { "type": "text", "marks": [{ "type": "em" }], "text": "italic" },
        { "type": "text", "text": ", with " },
        {
          "type": "text",
          "marks": [
            {
              "type": "link",
              "attrs": { "href": "https://heptabase.com" }
            }
          ],
          "text": "a link"
        },
        { "type": "text", "text": "." }
      ]
    }
  ]
}
```

### Todo Item

```json
{
  "type": "doc",
  "content": [
    {
      "type": "todo_list_item",
      "attrs": {
        "id": null,
        "checked": false,
        "lastUpdatedTime": "2026-05-26T00:00:00.000Z"
      },
      "content": [
        {
          "type": "paragraph",
          "attrs": { "id": null },
          "content": [{ "type": "text", "text": "Review schema rules" }]
        }
      ]
    }
  ]
}
```

### Code Block

```json
{
  "type": "doc",
  "content": [
    {
      "type": "code_block",
      "attrs": { "id": null, "params": "typescript" },
      "content": [{ "type": "text", "text": "const answer = 42;" }]
    },
    {
      "type": "code_block",
      "attrs": { "id": null, "params": "!mermaid:preview" },
      "content": [{ "type": "text", "text": "flowchart TD\n  A[Draft] --> B[Review]" }]
    }
  ]
}
```

Use `!` to enable line wrapping, for example `!typescript`. For Mermaid code blocks, append `:code`, `:preview`, or `:split` to choose the display mode.

### Inline Card Mention

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "attrs": { "id": null },
      "content": [
        { "type": "text", "text": "See also: " },
        {
          "type": "card",
          "attrs": { "cardId": "11111111-1111-4111-8111-111111111111" }
        }
      ]
    }
  ]
}
```

### Mirror Embed

```json
{
  "type": "doc",
  "content": [
    {
      "type": "embed",
      "attrs": {
        "id": null,
        "objectType": "note",
        "objectId": "11111111-1111-4111-8111-111111111111",
        "width": "100%",
        "alignment": "center"
      }
    }
  ]
}
```

### Math

`math_display` is a block; `math_inline` is an inline sibling next to `text` inside a paragraph. Neither uses `attrs` or a top-level `text` property for the formula. Put the TeX string in `content` as a single child `text` node. Multiple child `text` nodes are schema-valid, but prefer one child `text` node when creating new math content.

```json
{
  "type": "doc",
  "content": [
    {
      "type": "math_display",
      "attrs": { "id": null },
      "content": [{ "type": "text", "text": "\\int_0^1 x^2 \\,dx = \\frac{1}{3}" }]
    },
    {
      "type": "paragraph",
      "attrs": { "id": null },
      "content": [
        { "type": "text", "text": "Inline: " },
        {
          "type": "math_inline",
          "content": [{ "type": "text", "text": "a^2 + b^2 = c^2" }]
        },
        { "type": "text", "text": " in a sentence." }
      ]
    }
  ]
}
```

### Table

```json
{
  "type": "doc",
  "content": [
    {
      "type": "table",
      "attrs": { "id": null, "hasRowHeader": false, "hasColumnHeader": true },
      "content": [
        {
          "type": "table_row",
          "attrs": { "id": null },
          "content": [
            {
              "type": "table_header",
              "attrs": { "colspan": 1, "rowspan": 1 },
              "content": [
                {
                  "type": "paragraph",
                  "attrs": { "id": null },
                  "content": [{ "type": "text", "text": "Name" }]
                }
              ]
            },
            {
              "type": "table_header",
              "attrs": { "colspan": 1, "rowspan": 1 },
              "content": [
                {
                  "type": "paragraph",
                  "attrs": { "id": null },
                  "content": [{ "type": "text", "text": "Status" }]
                }
              ]
            }
          ]
        },
        {
          "type": "table_row",
          "attrs": { "id": null },
          "content": [
            {
              "type": "table_cell",
              "attrs": { "colspan": 1, "rowspan": 1 },
              "content": [
                {
                  "type": "paragraph",
                  "attrs": { "id": null },
                  "content": [{ "type": "text", "text": "Schema docs" }]
                }
              ]
            },
            {
              "type": "table_cell",
              "attrs": { "colspan": 1, "rowspan": 1 },
              "content": [
                {
                  "type": "paragraph",
                  "attrs": { "id": null },
                  "content": [{ "type": "text", "text": "Draft" }]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Dos

- Do read first and edit the returned `content` when replacing a card or journal.
- Do pass the latest `contentMd5` to `save`.
- Do preserve existing `id` values from `read`.
- Do use `id: null` or omit `id` on new blocks; the save handler backfills valid IDs.
- Do resolve real target IDs with CLI reads/lists before creating inline mentions or embeds.

## Don'ts

- Don't write an empty document.
- Don't put text in `attrs.text`.
- Don't create custom string IDs for new blocks.
- Don't invent UUIDs for `cardId`, `whiteboardId`, `pdfCardId`, `tagId`, or other references.
- Don't use `people` inline mentions through the CLI schema.
- Don't add `highlight` or `anchor` marks when creating new content.
- Don't set deprecated attrs on new content; preserve them only when editing existing JSON from `read`.
- Don't put file URIs in ProseMirror JSON node attrs (`src`, `url`, or `fileId`); media nodes take the bare `fileId`. File URIs belong only in Hepta Markdown media lines.
- Don't assume `embed` and block `mention` can target every card type; use only `note`, `journal`, `highlightElement`, `image`, `video`, or `audio`.
- Don't edit Heptabase local database files directly to bypass the CLI.
