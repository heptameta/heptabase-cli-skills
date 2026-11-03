# Importing Files And URLs

These commands bring outside content into Heptabase: files from your machine or from a URL, web pages, and YouTube videos. Each one makes a Heptabase file or a card. None of them changes an existing note; to show an image in a note, write it into the note yourself (see [Add An Image To A Note](#add-an-image-to-a-note)).

## Choose The Command

<!-- prettier-ignore -->
| The user gives you | Run | Result |
|---|---|---|
| A local file | `heptabase file import <path>`, then the card command for its `fileKind` | A Heptabase file, then a PDF, image, audio, or video card |
| A URL that serves a file, such as a PDF, image, audio, or video link | `heptabase file import --url <url>`, then the card command for its `fileKind` | The same |
| A YouTube video URL | `heptabase video create --url <url>` | A video card whose captions become its transcript in the background |
| A web page URL, such as an article or documentation page | `heptabase web create --url <url>` | A web card whose page content is extracted in the background |
| An image to show in a note | `heptabase file import <path>`, then `note append` with an image line of the `fileUri` | An image node in the note |

Use `file import --url` only when the URL serves the file itself, for example `https://arxiv.org/pdf/<arxivId>` or a link ending in `.pdf`. A web page imported with `file import --url` becomes a `fileKind: "file"` that no card can be made from, and the imported file stays in Heptabase unused. If that happens, use `web create` for the page and tell the user about the unused file.

## Import A File

```bash
heptabase file import <path>
heptabase file import - --name <filename>
heptabase file import --url <url>
heptabase file import <path> --file-id <fileId>
```

- `<path>` is a local file. Relative paths are resolved from the current directory. The CLI reads the file itself, so your own file permissions apply; an `EACCES` or `EPERM` error comes from your environment, not from Heptabase.
- `-` reads the file from stdin. `--name` is then required, for example `--name diagram.png`.
- `--url` downloads an `http` or `https` URL with your own network access, as `curl` would, so local and private addresses work too. Without `--name`, the file is named from the server's `Content-Disposition` header or the last part of the URL, and the extension of its detected type is added when the name has none: `https://arxiv.org/pdf/2401.01234` imports as `2401.01234.pdf`.
- `--name` sets the stored file name. Keep its extension: the app reads the type from the file's first bytes, then from the extension.
- `--file-id` imports under a given file ID. Use it only to retry an import (see [Retry An Import](#retry-an-import)).
- Any file type can be imported. A file must be non-empty and at most 2000 MB.

Example:

```bash
heptabase file import ./diagram.png
```

```json
{
  "status": "succeeded",
  "fileId": "33333333-3333-4333-8333-333333333333",
  "fileUri": "heptabase://file/33333333-3333-4333-8333-333333333333",
  "filename": "diagram.png",
  "fileKind": "image",
  "width": 1280,
  "height": 720
}
```

`width` and `height` are present only for images and videos. Pass `fileUri` to the card commands and to `file export`. An image node in a note uses `fileId`, `width`, and `height` instead.

`fileKind` says which card the file can become:

<!-- prettier-ignore -->
| `fileKind` | Make a card | Notes |
|---|---|---|
| `pdf` | `heptabase pdf create --file-uri "<fileUri>"` | Run `pdf parse` before reading its pages (see `references/pdf-reading.md`) |
| `image` | `heptabase image create --file-uri "<fileUri>"` | Or add it to a note |
| `audio` | `heptabase audio create --file-uri "<fileUri>"` | Not transcribed |
| `video` | `heptabase video create --file-uri "<fileUri>"` | Not transcribed. An MP4, WebM, or Matroska file without a picture imports as `audio` |
| `file` | None | No card type fits. HEIC, HEIF, and TIFF photos are `file`: convert them to JPEG or PNG and import the converted file |

A handled failure prints `status: "failed"` and exits with status `1`:

<!-- prettier-ignore -->
| `failureReasonCode` | Meaning | What to do |
|---|---|---|
| `fileUnreadable` | An image or video (`fileKind`) whose dimensions could not be read | The file is damaged or in a format the app cannot show. Convert it, then import the converted file |
| `fileIdConflict` | The `--file-id` belongs to a different file, or a failed import left a file under it | Import again without `--file-id` |
| `invalidUrl` | `--url` is not an `http` or `https` URL | Fix the URL |
| `downloadFailed` | The server refused the download or sent an empty file (`httpStatus`), or could not be reached or stopped sending (`httpStatus: null`) | `401` or `403`: the file needs a login, so ask the user to download it and import the path. `404` or an empty file: check the URL. `null`: retry once, then report it |
| `fileTooLarge` | The download is over 2000 MB | Tell the user |

## Make A Card From A File

```bash
heptabase pdf create --file-uri "<fileUri>"
heptabase image create --file-uri "<fileUri>" --title "Architecture diagram"
heptabase audio create --file-uri "<fileUri>"
heptabase video create --file-uri "<fileUri>"
```

Example response:

```json
{
  "status": "created",
  "pdfCardId": "44444444-4444-4444-8444-444444444444",
  "title": "paper"
}
```

- Pass the `fileUri` from `file import`, or a PDF or media card's `fileUri` from `file list`. Quote it in the shell.
- The card ID field is `pdfCardId`, `imageCardId`, `audioCardId`, or `videoCardId`.
- The title defaults to the file name without its extension. `--title` sets it (1 to 255 characters).
- `status` is `created`, `alreadyExists` (the file already has a card of this kind, which is returned instead of a new one), or `restoredFromTrash` (that card was in the trash and is back). Running the same command again never makes a duplicate.
- A new card is marked Created by AI; see `references/created-by-ai.md`.
- Audio and video cards made from files are not transcribed. `audio read` and `video read` have nothing to return until the user generates a transcript in the app.

A handled failure prints `status: "failed"` and exits with status `1`:

<!-- prettier-ignore -->
| `failureReasonCode` | Meaning | What to do |
|---|---|---|
| `fileNotFound` | No file with this ID that this account imported into its own space | Use the `fileUri` that `file import` or `file list` returned |
| `fileKindMismatch` | The file is another kind, named in `fileKind` | Use the command for that kind; a `file` cannot become a card |
| `cardCreationNotAllowed` | The user's plan or space does not allow a new card | Tell the user |

A value that is not a file URI fails before anything runs, with a `Not a file URI` error.

## Save A Web Page

```bash
heptabase web create --url <url>
```

Example response:

```json
{
  "status": "created",
  "webCardId": "55555555-5555-4555-8555-555555555555",
  "title": "https://example.com/article"
}
```

- The card is titled with the URL until the app reads the page title. The page title replaces it only while the title is still the URL, so a rename right after `web create` is kept.
- The app extracts the page content, cover, and archive in the background; the command does not wait for it. Read the content with `heptabase object read webCard <webCardId>`. While extraction is still running, the read says the card has no content yet; wait and read again.
- `status` is `created`, `alreadyExists` (the space already has a web card for this URL, matched as given or normalized), or `restoredFromTrash`. A new card is marked Created by AI.
- Failures: `invalidUrl` (not an `http` or `https` URL) and `cardCreationNotAllowed`. Both print `status: "failed"` and exit with status `1`.

## Save A YouTube Video

```bash
heptabase video create --url <youtubeUrl>
heptabase video create --url <youtubeUrl> --title "Lecture 3"
```

- Returns `{ status, videoCardId, title }` with the same `status` values as above. The title defaults to the video title.
- The video's captions become the card's transcript in the background. Check `transcriptStatus` with `heptabase video metadata <videoCardId>`, then read it as described in `references/transcript-reading.md`.
- Failures: `invalidUrl`, `unsupportedVideoUrl` (not a YouTube video URL), and `cardCreationNotAllowed`. For a direct link to a video file, use `file import --url`, then `video create --file-uri`.
- Pass exactly one of `--url` or `--file-uri`.

## Add An Image To A Note

1. Import the image with `heptabase file import <path>` and keep `fileUri`.

2. Write the `fileUri` as a Hepta Markdown image line, on a line of its own. To add the image at the end of a note or journal, append it:

```bash
heptabase note append <cardId> --content '![Architecture diagram](heptabase://file/33333333-3333-4333-8333-333333333333)'
```

For a new note, put the same line in the `note create` content; first read `references/created-by-ai.md` to decide on `--no-created-by-ai`. To change the layout, add `{width=60% alignment=left}` right after the image; see `references/card-content-schema.md`.

The desktop app fills in the image's `originalWidth` and `originalHeight` the first time it shows the image, which changes the note's `contentMd5`. Read the note again before a later `note save` or `note append --content-md5`.

### Insert An Image In The Middle Of A Note

`append` only adds to the end. To place the image elsewhere, save the note's ProseMirror JSON. Before saving, read `references/card-content-schema.md`.

1. Import the image with `heptabase file import <path>` and keep `fileId`, `width`, and `height`.

2. Read the note:

```bash
heptabase note read <cardId>
```

3. Add an `image` node to the returned document. Set `fileId`, and set `originalWidth` and `originalHeight` to the imported `width` and `height`:

```json
{ "type": "image", "attrs": { "fileId": "33333333-3333-4333-8333-333333333333", "originalWidth": 1280, "originalHeight": 720 } }
```

Keep every existing node. Insert the image where it belongs, for example after the paragraph that refers to it. Do not put a file URI in `fileId`, `src`, or `url`: stored image nodes use the bare `fileId`.

4. Write the full document to a file, then save it with the `contentMd5` from step 2:

```bash
heptabase note save <cardId> --content-md5 <contentMd5> --content-file <path>
```

5. Read the note again to confirm the image node is there.

Always set `originalWidth` and `originalHeight` in JSON. Without them, the desktop app writes them into the note the first time it shows the image. That changes the note's `contentMd5`, so a later save with the old hash fails with a conflict.

If the save fails, read the note again for the latest `contentMd5`, then retry the save with the same `fileId`. Do not import the image again.

## Retry An Import

An import error is printed as `{ "fileId", "error" }` and includes the attempted `fileId`. A timeout returns the error code `importOutcomeUnknown`, because the import may still finish:

```json
{
  "fileId": "33333333-3333-4333-8333-333333333333",
  "error": {
    "code": "importOutcomeUnknown",
    "message": "The import outcome is unknown. ...",
    "retryable": true
  }
}
```

Run the same command again with that ID. For `--url`, the retry downloads the file again:

```bash
heptabase file import ./diagram.png --file-id 33333333-3333-4333-8333-333333333333
```

<!-- prettier-ignore -->
| Result | Meaning | What to do |
|---|---|---|
| `status: "succeeded"` | The first import finished, or this retry imported the file | Use the result |
| `importInProgress` error | The first import is still running | Wait a few seconds, then retry with the same `--file-id` |
| `fileIdConflict` failure | The ID belongs to a different file, or a failed import left a file behind | Import again without `--file-id` to get a new ID |

Use `--file-id` only to retry the same file. Heptabase never replaces an existing file with a different one.

## Troubleshooting

- `File must be non-empty.` or `File must be at most ... bytes.`: check the file before importing it again.
- `ENOENT`, `EACCES`, or `Not a regular file` from the CLI: the path is wrong, points to a directory, or you cannot read the file. The CLI reads the file before it contacts Heptabase.
- `--name is required when reading the file from stdin` or `Pipe the file into stdin, or pass a file path`: with `-`, pipe the file into the command and pass `--name`.
- `Pass exactly one of <path> or --url`: give a path or `--url`, not both.
- `The workspace changed during file import.`: the user switched spaces in the app during the import. Ask them to switch back, then retry.
- If you stop before making a card or saving the note, the imported file stays in Heptabase unused. The CLI cannot delete it, so tell the user.
