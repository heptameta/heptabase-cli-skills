# Tags And Tag Databases

Every tag is also a database: the cards with the tag are its rows, its properties are the columns, and it has one or more table or kanban views. Tags form trees (a tag can have a parent tag). Tag groups are top-level sections of the Tags sidebar that hold tag trees; a tag group is not a tag and cannot be a parent tag.

To read or set a property value on one card, read `references/property-values.md` instead.

## IDs

- **Tag ID:** what every `tag` command takes, and what `tag list`, `tag properties`, and `card properties` show. Use it by default.
- **Database ID:** a separate ID for the same database, returned as `id` by `tag create` and `tag edit`. You only need it with `--database-id`.
- **Tag group ID:** shown on group lines of `tag list` and returned by `tag create-group`. Only `tag move --tag-group-id` takes it.

`tag create` returns both IDs. Use `tagId`, not `id`, with the other `tag` commands.

## Command Summary

```bash
heptabase tag list [--name-filter <text>] [--parent-tag-id <tagId>] [--offset <n>] [--limit <n>]
heptabase tag properties <tagId>
heptabase tag cards <tagId> [--include-properties]
heptabase tag query <tagId> --fields <title,propertyId,...> [--filter <json>] [--sorts <json>] [--limit <n>] [--offset <n>]
heptabase tag create --name <name>
heptabase tag edit <tagId> --edits <path|->
heptabase tag create-group --name <name>
heptabase tag move <tagId...> (--parent-tag-id <tagId> | --tag-group-id <tagGroupId> | --ungrouped)
heptabase tag add --card-id <cardIdOrDate> --tag-name <name>
heptabase tag remove --card-id <cardIdOrDate> --tag-id <tagId>
```

`tag query` and `tag edit` also accept `--database-id <databaseId>` instead of `<tagId>`.

## List Tags

`tag list` returns `{ content }`: the tag tree as indented text, with tag groups as section lines. Read the text; do not parse it as data.

```text
Tags:
tag "Projects" [11111111-1111-4111-8111-111111111111] 12 cards
  tag "Launch" [22222222-2222-4222-8222-222222222222] 4 cards
--- Group "Research" [33333333-3333-4333-8333-333333333333] ---
  tag "Papers" [44444444-4444-4444-8444-444444444444] 31 cards
```

- IDs are in square brackets. Lines starting with `---` are tag groups; the tags under them belong to that group.
- Pages go over top-level tags: `--offset` defaults to `0` and `--limit` to `20` (at most `50`). When more remain, the text ends with the next offset.
- A large tree can omit child tags to fit the output. The text then says so; list one branch with `--parent-tag-id <tagId>`.
- `--name-filter` keeps tags whose name contains the text, ignoring case.

## Query Rows

Use `tag query` to find cards by property value, instead of reading every card with `tag cards --include-properties`.

1. Run `heptabase tag properties <tagId>` for property IDs, types, and select option IDs.
2. Build the filter and sorts as JSON with `jq`, so values are quoted correctly.
3. Run the query and read `content`. When `hasMore` is `true`, run it again with `--offset` increased by the limit.

```bash
filter=$(jq -cn --arg field "$statusPropertyId" --arg option "$doneOptionId" \
  '{combinator: "and", rules: [{field: $field, operator: "=", value: $option}]}')
sorts=$(jq -cn '[{field: "lastEditedTime", direction: "descending"}]')
heptabase tag query <tagId> --fields "title,$statusPropertyId" --filter "$filter" --sorts "$sorts" --limit 50
```

- `--fields` is a comma-separated list of `title` and property IDs.
- `--filter` is `{ combinator: "and" | "or", rules: [{ field, operator, value }] }`. Omit `value` for `isEmpty` and `isNotEmpty`.
- `--sorts` is `[{ field, direction: "ascending" | "descending" }]`. A sort field is a property ID, `title`, `createdTime`, or `lastEditedTime`. Without sorts, rows are newest first.
- `--limit` defaults to `50` (at most `200`); `--offset` defaults to `0`.

The result is `{ content, hasMore }`. `content` lists the requested columns, then each row as its card reference and one JSON value per field, in column order:

```text
Columns:
1. title
2. 66666666-6666-4666-8666-666666666666

Rows:
[1] card/77777777-7777-4777-8777-777777777777
1: "Launch plan"
2: "Done"
```

A select value shows the option name, a multi-select value a list of names, a date `"YYYY-MM-DD"` or `"YYYY-MM-DD to YYYY-MM-DD"`, a relation a list of card references, and an empty value `null`.

### Filter Rules

<!-- prettier-ignore -->
| Field | Operators | `value` |
|---|---|---|
| `title`, or a text, URL, phone, or email property | `=`, `!=`, `contains`, `doesNotContain`, `startsWith`, `endsWith` | A string |
| Number property | `=`, `!=`, `>`, `<`, `>=`, `<=` | A number |
| Select property | `=`, `!=` | An option ID from `tag properties` |
| Multi-select or relation property | `contains`, `doesNotContain` | One ID in an array: `["<optionId>"]` or `["<relatedCardId>"]` |
| Checkbox property | `=`, `!=` | `true` or `false` |
| Date property, `createdTime`, `lastEditedTime` | `=`, `!=`, `<`, `>` | `{ "type": "date", "date": "YYYY-MM-DD" }` or `{ "type": "preset", "preset": "today" }` (or `"yesterday"`) |
| The same date fields | `isBetween` | `{ "type": "range", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" }` |
| The same date fields | `isWithin`, `isNotWithin` | `{ "type": "relative", "direction": "this" \| "past" \| "next", "amount": 1, "unit": "day" \| "week" \| "month" \| "year" }` |
| `tag` | `contains`, `doesNotContain` | One tag ID in an array |
| `whiteboard` | `contains`, `doesNotContain` | One whiteboard ID in an array |
| `keyword` | `contains`, `doesNotContain` | Text to search for in the card |
| Property fields and `whiteboard` | `isEmpty`, `isNotEmpty` | Omit `value` |

Dates are local calendar dates, and relative weeks follow the account's week start.

### Query Errors

- An unknown field, sort field, or invalid filter rule returns an error naming it. Check the IDs with `tag properties` and the rule against the table above.
- `Tag database not found` means the tag ID or database ID does not exist in the user's own space.
- Passing both a tag ID and `--database-id` of different databases returns an error.

## Create A Tag Database

```bash
heptabase tag create --name "Reading List"
```

```json
{
  "id": "88888888-8888-4888-8888-888888888888",
  "tagId": "99999999-9999-4999-8999-999999999999",
  "name": "Reading List"
}
```

- The new tag database has one table view and no properties; add them with `tag edit`.
- The tag is always marked Created by AI; there is no flag to turn it off.
- A tag with the same name already exists: the command fails with `409` and names the existing tag's ID. Use that tag instead.
- `tag add --card-id <cardIdOrDate> --tag-name <name>` also creates a missing tag while tagging a card. Use `tag create` when you need the tag before any card has it.

## Edit A Tag Database

`tag edit` applies an array of edits in order. Write the array to a file with `jq`, or pipe it with `--edits -`:

```bash
jq -n '[
  {action: "createProperty", propertyId: "CREATE-status",
   property: {type: "select", name: "Status", options: [
     {id: "CREATE-todo", name: "To do", color: "red"},
     {id: "CREATE-done", name: "Done", color: "green"}]}},
  {action: "createView", viewId: "CREATE-board",
   view: {type: "kanban", name: "Board", filter: null, sorts: [], groupByPropertyId: "CREATE-status"}}
]' | heptabase tag edit <tagId> --edits -
```

To create a property, option, or view, give it a placeholder ID that starts with `CREATE-` and has a name after the dash, such as `CREATE-status`. Later edits in the same array can use the placeholder, as `groupByPropertyId` does above. To change existing items, use the IDs from `tag properties` (properties and options) or from the `configuration` that `tag edit` returns (views).

<!-- prettier-ignore -->
| `action` | Fields |
|---|---|
| `renameDatabase` | `name` |
| `createProperty` | `propertyId` (`CREATE-…`), `property`: `{ type, name }`, plus `options` for `select` and `multiSelect`, or `tagId` (the target tag) for `relation` |
| `renameProperty` | `propertyId`, `name` |
| `upsertPropertyOption` | `propertyId` (a select or multi-select property), `optionId` (an existing option ID to rename or recolor, or `CREATE-…` to add one), `name`, optional `color` |
| `createView` | `viewId` (`CREATE-…`), `view`: `{ type: "table" \| "kanban", name, filter, sorts }`, plus `groupByPropertyId` (a select property) for `kanban` |
| `renameView` | `viewId`, `name` |
| `setViewFilter` | `viewId`, `filter` (a filter object, or `null` to clear it) |
| `setViewSorts` | `viewId`, `sorts` (an array, `[]` to clear it) |
| `setViewGroupByProperty` | `viewId` (a kanban view), `propertyId` (a select property) |
| `attachProperty` | `propertyId`: the UUID of an existing property shared from another tag database |

- Property types: `text`, `number`, `date`, `checkbox`, `url`, `phone`, `email`, `select`, `multiSelect`, `relation`.
- An option is `{ id, name, color? }`. Colors: `yellow`, `red`, `blue`, `green`, `black`, `orange`, `purple`, `white`.
- Names are 1 to 255 characters.
- View filters and sorts use the same fields and operators as `tag query`, except that every view filter rule has a `value`: use `null` for `isEmpty` and `isNotEmpty`.

A successful edit returns `{ status: "success", id, tagId, configuration }`. `configuration` is the database after the edits: its `name`, its `views` by view ID, and its `schema` (properties) by property ID, with option IDs.

When one edit fails, the edits before it stay applied and the rest are skipped. The command prints `{ status: "failed", id, tagId, configuration, failedEditIndex, failedEdit, reason }` and exits with status `1`. Fix the failed edit and send only it and the edits after it; do not resend the earlier edits, or they apply twice.

Other errors: `Tag database not found` for an unknown tag or database ID, an error when the two IDs belong to different databases, and a permission error when the user cannot edit the database. `tag edit` cannot delete a tag, property, option, or view.

## Tag Groups And The Tag Tree

```bash
heptabase tag create-group --name "Research"
heptabase tag move <tagId> <tagId> --tag-group-id <tagGroupId>
heptabase tag move <tagId> --parent-tag-id <parentTagId>
heptabase tag move <tagId> --ungrouped
```

- `tag create-group` returns `{ content }` with the new group's name and ID, for example `Created tag group "Research" [<tagGroupId>].`
- `tag move` moves each tag with its whole subtree. All tags in one command share one destination: under a parent tag, as roots in a tag group, or as ungrouped roots. Moving under a parent puts the tag into the parent's tag group.
- `tag move` returns `{ content }` listing the moved tags and the unchanged ones (already there, or covered by another selected ancestor).
- If any tag cannot move (for example, it is missing, managed by an integration such as Zotero, or contains the destination parent), nothing moves. The command exits with status `1` and the error lists each tag's reason. Run `tag list` to check the current tree before retrying.
- Other failures of both commands (an empty name, no edit permission, an unavailable destination) print an `error` with the reason and exit with status `1`.
