# Created by AI Marking

`note create` and `journal create` mark new content as **Created by AI** by default.

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

## Timing

- The mark is set **only at create time**. Later `append` / `save` do not add or remove it.
- Prefer deciding before the first `create`. Do not create unmarked then recreate just to change the mark.
- For journals, the mark is written only when the journal date did not already have a journal row (filling an existing empty journal does not add the mark).
