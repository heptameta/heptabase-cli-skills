# Created by AI Marking

`note create` and `journal create` mark new content as **Created by AI** by default. Other create commands always mark it; see [Always marked](#always-marked).

For notes, Card Library’s Created by AI filter keeps them separate from human-owned cards.
For journals, the same create-time mark is stored as `aiArtifactInfo`; later `append` / `save` cannot change it. Journals are not shown in the Card Library Created by AI filter.

## Default (mark)

Use the default when you are drafting, researching, summarizing, or otherwise generating content as an agent. Leave the mark on so the user can filter AI-created notes in Card Library.

```bash
heptabase note create --content "# Draft\n\n..."
heptabase journal create --content "..."
```

## Opt out (`--no-created-by-ai`)

Pass `--no-created-by-ai` when the user wants the note or journal as **theirs** — for example:

- They ask you to capture or write something they will own and edit as a normal note or journal
- They are dictating or you are acting only as a scribe
- They explicitly say not to mark it as Created by AI

```bash
heptabase note create --no-created-by-ai --content "# My note\n\n..."
heptabase journal create --no-created-by-ai --content "..."
```

## Always marked

These commands always mark what they create as Created by AI. They have no `--no-created-by-ai` flag:

- `tag create`
- `pdf create`, `image create`, `audio create`, and `video create` (with `--file-uri` or `--url`)
- `web create`

The mark goes only on a new card or tag. When the result `status` is `alreadyExists` or `restoredFromTrash`, the command returns an existing card and does not mark it. If the user wants the item as theirs, tell them before you run the command that it will be marked Created by AI.

## Timing

- The mark is set **only at create time**. Later `append` / `save` do not add or remove it.
- Prefer deciding before the first `create`. Do not create unmarked then recreate just to change the mark.
- For journals, the mark is written only when the journal date did not already have a journal row (filling an existing empty journal does not add the mark).
