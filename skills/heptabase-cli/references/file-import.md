# File Import

Use `heptabase file import` to copy a local file, or a file from a URL, into Heptabase. Then make a card from it, or add an image to a note.

## Command Summary

```bash
heptabase file import <path>
heptabase file import - --name <file-name>
heptabase file import --url <url>
heptabase file import <path> --file-id <fileId>
```

- `<path>` is the local file. Relative paths are resolved from the current directory.
- `-` reads the file from stdin. `--name` is then required, for example `--name diagram.png`.
- `--url` downloads an http or https URL. The CLI downloads it with your own network access, like `curl`, so local and private addresses work too. Without `--name`, the file is named from the server's file name or the end of the URL, and gets the extension of its type when the name has none.
- `--name` sets the file name with its extension. It defaults to the name in `<path>` or the URL.
- `--file-id` sets the file ID to import as. Use it only to retry an import (see [Retry An Import](#retry-an-import)).
- The CLI reads the file itself, so your own file permissions apply. A permission error such as `EACCES` or `EPERM` comes from your environment, not from Heptabase.
- Any file type can be imported. A file must be non-empty and at most 2000 MB.

## Import

```bash
heptabase file import ./paper.pdf
heptabase file import --url https://arxiv.org/pdf/1706.03762
```

Example response:

```json
{
  "status": "succeeded",
  "fileId": "33333333-3333-4333-8333-333333333333",
  "filename": "diagram.png",
  "fileKind": "image",
  "width": 1280,
  "height": 720
}
```

`fileKind` says what Heptabase can make from the file. `width` and `height` are set only for images and videos.

<!-- prettier-ignore -->
| `fileKind` | Make a card | Also |
|---|---|---|
| `pdf` | `heptabase pdf create --file-id <fileId>` | |
| `image` | `heptabase image create --file-id <fileId>` | Add it to a note (see [Add An Image To A Note](#add-an-image-to-a-note)) |
| `audio` | `heptabase audio create --file-id <fileId>` | |
| `video` | `heptabase video create --file-id <fileId>` | |
| `file` | No card for this type | HEIC, HEIF and TIFF photos are `file`: convert them to JPEG or PNG and import that |

`file import` does not create a card or change any note. It only adds the file to Heptabase.

A failed import prints `status: "failed"` and exits with status `1`:

<!-- prettier-ignore -->
| `failureReasonCode` | Meaning | What to do |
|---|---|---|
| `fileUnreadable` | An image or video (`fileKind`) whose size could not be read | The file is damaged or in a format the app cannot show. Convert it, then import the converted file |
| `fileIdConflict` | The `--file-id` belongs to a different file | Import again without `--file-id` |
| `invalidUrl` | `--url` is not an http or https URL | Fix the URL |
| `downloadFailed` | The server refused the download (`httpStatus`), or could not be reached (`httpStatus: null`) | 401 or 403: the file needs a login; download it yourself and import the path. 404: check the URL |
| `fileTooLarge` | The download is over 2000 MB | |

## Make A Card

```bash
heptabase pdf create --file-id <fileId>
heptabase image create --file-id <fileId> --title "Architecture diagram"
```

Example response:

```json
{
  "status": "created",
  "pdfCardId": "44444444-4444-4444-8444-444444444444",
  "title": "Attention Is All You Need"
}
```

- The title defaults to the file name without its extension. Pass `--title` to set it.
- `status` is `created`, `alreadyExists` (the file already has a card of this kind, which is returned instead of a new one) or `restoredFromTrash` (that card was in the trash and is back). Running the same command again never makes a duplicate.
- A PDF card's pages can be read with `pdf read` only after the PDF is parsed (see `references/pdf-reading.md`). Audio and video cards from files are not transcribed.
- `video create` also takes `--url <youtubeUrl>` instead of `--file-id`, to save a YouTube video. The title then defaults to the video title, and its captions become the card's transcript in the background.

A failed card prints `status: "failed"` and exits with status `1`:

<!-- prettier-ignore -->
| `failureReasonCode` | Meaning | What to do |
|---|---|---|
| `fileNotFound` | No file with this ID in your own workspace | Use the `fileId` from `file import` |
| `fileKindMismatch` | The file is another kind (`fileKind`) | Use the command for that kind |
| `cardCreationNotAllowed` | The app's plan or space does not allow a new card | Tell the user |
| `invalidUrl` or `unsupportedVideoUrl` | `video create --url` got a URL that is not a YouTube video | Download the video and import it, or check the URL |

## Add An Image To A Note

Before saving ProseMirror JSON, read `references/card-content-schema.md`.

1. Read the note:

```bash
heptabase note read <cardId>
```

2. Add an `image` node to the returned document. Use the import result: set `fileId`, and set `originalWidth` and `originalHeight` to `width` and `height`:

```json
{ "type": "image", "attrs": { "fileId": "33333333-3333-4333-8333-333333333333", "originalWidth": 1280, "originalHeight": 720 } }
```

Keep every existing node. Insert the image where it belongs, for example after the paragraph that refers to it.

3. Write the full document to a file, then save it with the `contentMd5` from step 1:

```bash
heptabase note save <cardId> --content-md5 <contentMd5> --content-file <path>
```

4. Read the note again to confirm the image node is there.

Always set `originalWidth` and `originalHeight`. Without them, the desktop app writes them into the note the first time it shows the image. That changes the note's `contentMd5`, so a later save with the old hash fails with a conflict.

For a new note, first read `references/created-by-ai.md` to decide on `--no-created-by-ai`, run `heptabase note create --content "# Title"`, then follow the same steps with the returned card ID.

If the save fails, read the note again for the latest `contentMd5`, then retry the save with the same `fileId`. Do not import the image again.

## Retry An Import

Every import error includes the attempted `fileId`. A timeout returns the error code `importOutcomeUnknown`, because the import may still finish:

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

Run the same command again with that ID:

```bash
heptabase file import ./diagram.png --file-id 33333333-3333-4333-8333-333333333333
```

<!-- prettier-ignore -->
| Result | Meaning | What to do |
|---|---|---|
| `status: "succeeded"` | The first import finished, or this retry imported the file | Use the result |
| `importInProgress` error | The first import is still running | Wait a few seconds, then retry with the same `--file-id` |
| `fileIdConflict` | The ID belongs to a different file, or a failed import left a file behind | Import again without `--file-id` to get a new ID |

Use `--file-id` only to retry the same file. Heptabase never replaces an existing file with a different one.

## Troubleshooting

- `File must be non-empty.` or a size error: check the file before importing it again.
- `ENOENT`, `EACCES`, or `Not a regular file` from the CLI: the path is wrong, points to a directory, or you cannot read the file. The CLI reads the file before it contacts Heptabase.
- `--name is required when reading the file from stdin` or `Pipe the file into stdin, or pass a file path`: with `-`, pipe the file into the command and pass `--name`.
- `Pass exactly one of <path> or --url`: give a path or `--url`, not both.
- If you stop before making a card or saving the note, the imported file stays in Heptabase without being used. Tell the user when that happens.
