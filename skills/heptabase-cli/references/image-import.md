# Image Import

Use `heptabase file import` to copy a local image into Heptabase. Then add it to a note with an `image` node.

## Command Summary

```bash
heptabase file import <path>
heptabase file import - --name <file-name>
heptabase file import <path> --file-id <fileId>
```

- `<path>` is the local image. Relative paths are resolved from the current directory.
- `-` reads the image from stdin. `--name` is then required, for example `--name diagram.png`.
- `--file-id` sets the file ID to import as. Use it only to retry an import that timed out (see [Retry After A Timeout](#retry-after-a-timeout)).
- The CLI reads the file itself, so your own file permissions apply. A permission error such as `EACCES` or `EPERM` comes from your environment, not from Heptabase.
- Supported: images the desktop app can display. Not supported: HEIC, HEIF, TIFF, and non-image files. A file must be non-empty and at most 2000 MB.

## Import

```bash
heptabase file import ./diagram.png
```

Example response:

```json
{
  "fileId": "33333333-3333-4333-8333-333333333333",
  "name": "diagram.png",
  "mimeType": "image/png",
  "size": 48213,
  "width": 1280,
  "height": 720
}
```

`file import` does not create a card or change any note. It only adds the file to Heptabase, so add it to a note next.

## Add The Image To A Note

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

## Retry After A Timeout

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
| Normal import result | The first import finished, or this retry imported the file | Use the result |
| `importInProgress` error | The first import is still running | Wait a few seconds, then retry with the same `--file-id` |
| `fileIdConflict` error | The ID belongs to a different file, or a failed import left a file behind | Import again without `--file-id` to get a new ID |

Use `--file-id` only to retry the same file. Heptabase never replaces an existing file with a different one.

## Troubleshooting

- `File import currently supports images only.`: the file is not a supported image. Convert HEIC, HEIF, or TIFF images to PNG or JPEG first, then import the converted file.
- `The file could not be decoded as an image.`: the file is damaged, or the desktop app cannot display its format.
- `File must be non-empty.` or a size error: check the file before importing it again.
- `ENOENT`, `EACCES`, or `Not a regular file` from the CLI: the path is wrong, points to a directory, or you cannot read the file. The CLI reads the file before it contacts Heptabase.
- `--name is required when reading the image from stdin` or `Pipe the image into stdin, or pass a file path`: with `-`, pipe the image into the command and pass `--name`.
- If you stop before saving the note, the imported file stays in Heptabase without being used in any note. Tell the user when that happens.
