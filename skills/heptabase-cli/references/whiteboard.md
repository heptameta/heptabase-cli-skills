# Whiteboard work

Use this reference for whiteboard structure reads, layout changes, and visual checks. Copy IDs and object types from current CLI output. Do not guess them.

## Read before writing

Start each layout-changing turn from current state:

```bash
heptabase whiteboard read <whiteboardId> --mode structure
heptabase whiteboard read-layout <whiteboardId>
```

Use `--mode content` when grouping or order depends on meaning. Add `--include-connection-ids` when inspecting or repairing routes.

For a focused layout read, send canonical JSON:

```json
{
  "whiteboardId": "<whiteboardId>",
  "focus": {
    "objects": [
      { "id": "inst:<placementId>", "objectType": "card" },
      { "id": "<sectionId>", "objectType": "section" }
    ],
    "padding": 160
  },
  "shouldIncludeConnectionIds": true
}
```

Pass it as a file or through stdin:

```bash
heptabase whiteboard read-layout --input input.json
jq -n --arg id '<whiteboardId>' '{whiteboardId: $id}' | heptabase whiteboard read-layout --input -
```

`focus` and `viewport` are mutually exclusive. A viewport has `x`, `y`, `width`, and `height`.

## Object references

Most whiteboard inputs use:

```json
{ "id": "<objectId>", "objectType": "<objectType>" }
```

- Copy `objectType` exactly from `whiteboard read` or `read-layout`.
- Use the exact `inst:<placementId>` whenever layout output provides it. A canonical object may have more than one visible placement.
- `place-objects` is different: it takes canonical source IDs or a journal date, never `inst:` IDs.
- Read both source and destination layouts before a cross-whiteboard move.

## Selections and destinations

Selections:

```json
{ "type": "objects", "objects": [{ "id": "inst:<placementId>", "objectType": "card" }] }
```

```json
{ "type": "box", "box": { "x": 0, "y": 0, "width": 1200, "height": 800 } }
```

```json
{ "type": "all" }
```

`all` is only supported by `move-objects-across`. A box is resolved against current layout at execution time, so reread and reconfirm it if the board may have changed.

Destinations:

```json
{ "type": "auto" }
```

```json
{ "type": "point", "x": 100, "y": 200 }
```

```json
{ "type": "delta", "dx": 300, "dy": 0 }
```

```json
{
  "type": "nextTo",
  "objectId": "inst:<anchorPlacementId>",
  "objectType": "card",
  "side": "right",
  "gap": 120,
  "alignment": "center"
}
```

```json
{ "type": "inSection", "sectionId": "<sectionId>" }
```

`place-objects` and `create-shortcut` support `auto`, `point`, `nextTo`, and `inSection`. `move-objects` supports `delta`, `point`, and `nextTo`. `arrange-objects` has an optional `point` or `nextTo` anchor.

## Safe layout loop

1. Read semantic structure and current layout. Include connection IDs when routes are in scope.
2. Define the smallest authorized object set. Preserve unrelated content and the board's existing visual rules.
3. Resize objects before arranging them. Treat input order as reading order.
4. Apply one coherent mutation group and inspect all handled failure fields in the JSON result.
5. Reread the changed area and run `heptabase whiteboard lint <whiteboardId>`.
6. Export and inspect a focused screenshot. Repair and repeat. For substantial work, finish with a whole-board screenshot and lint.

A clean lint result does not prove the layout is understandable. A screenshot does not replace reading content or linting geometry.

## Placement and hierarchy

Create and move hierarchy with flat flags:

```bash
heptabase whiteboard create --title "Projects" --parent-whiteboard-id <parentWhiteboardId>
heptabase whiteboard move <whiteboardId> --target-parent-whiteboard-id <parentWhiteboardId>
heptabase object rename whiteboard <whiteboardId> --new-name "Projects"
```

Omit `--target-parent-whiteboard-id` to move a whiteboard to root. A shortcut does not change hierarchy:

```bash
heptabase whiteboard create-shortcut --input input.json
```

```json
{
  "whiteboardId": "<destinationWhiteboardId>",
  "linkedWhiteboardId": "<linkedWhiteboardId>",
  "destination": { "type": "auto" }
}
```

Place existing source objects:

```bash
heptabase whiteboard place-objects --input input.json
```

```json
{
  "whiteboardId": "<whiteboardId>",
  "objects": [
    { "id": "<cardId>", "objectType": "card" },
    { "id": "<pdfCardId>", "objectType": "pdfCard" }
  ],
  "destination": { "type": "auto" }
}
```

Supported placement types are `card`, `journal`, `pdfCard`, `imageCard`, `videoCard`, `audioCard`, and `webCard`.

## Move, arrange, and align

Move one or more selections on the same whiteboard:

```bash
heptabase whiteboard move-objects --input input.json
```

```json
{
  "whiteboardId": "<whiteboardId>",
  "moves": [
    {
      "selection": {
        "type": "objects",
        "objects": [{ "id": "inst:<placementId>", "objectType": "card" }]
      },
      "destination": {
        "type": "nextTo",
        "objectId": "<sectionId>",
        "objectType": "section",
        "side": "right"
      }
    }
  ]
}
```

Move a selection to another whiteboard:

```bash
heptabase whiteboard move-objects-across --input input.json
```

```json
{
  "sourceWhiteboardId": "<sourceWhiteboardId>",
  "destinationWhiteboardId": "<destinationWhiteboardId>",
  "selection": { "type": "all" }
}
```

This keeps relative layout and relations fully inside the moved group. Relations crossing the selection boundary are removed and reported. Cross-space moves are not supported.

Arrange objects in input order:

```bash
heptabase whiteboard arrange-objects --input input.json
```

```json
{
  "whiteboardId": "<whiteboardId>",
  "objects": [
    { "id": "inst:<firstPlacementId>", "objectType": "card" },
    { "id": "inst:<secondPlacementId>", "objectType": "card" }
  ],
  "layout": { "type": "row", "gap": 0, "alignment": "center" },
  "anchor": { "type": "point", "x": 100, "y": 200 }
}
```

Layout shapes are:

- Row: `type`, optional `gap`, optional `alignment` of `top`, `center`, or `bottom`.
- Column: `type`, optional `gap`, optional `alignment` of `left`, `center`, or `right`.
- Grid: `type`, optional `columns`, `rowGap`, and `columnGap`.

Use a grid only for genuine peers. Use exact center alignment for a direct connected handoff.

Align targets to their own selection bounds or stationary references:

```bash
heptabase whiteboard align-objects --input input.json
```

```json
{
  "whiteboardId": "<whiteboardId>",
  "targetObjects": [{ "id": "inst:<placementId>", "objectType": "card" }],
  "referenceObjects": [{ "id": "inst:<referencePlacementId>", "objectType": "card" }],
  "alignment": "centerVertically"
}
```

Alignment values are `left`, `centerHorizontally`, `right`, `top`, `centerVertically`, and `bottom`. Alignment changes only one axis.

Never arrange or move a Section together with one of its descendants. Moving a Section already carries its members.

## Resize, color, remove, and section

Resize examples:

```bash
heptabase whiteboard resize-objects --input input.json
```

```json
{
  "whiteboardId": "<whiteboardId>",
  "resizes": [
    { "id": "inst:<readerCardPlacementId>", "objectType": "card", "mode": "fitToContent" },
    { "id": "inst:<sourcePlacementId>", "objectType": "pdfCard", "mode": "defaultSize" },
    { "id": "inst:<mediaPlacementId>", "objectType": "imageCard", "mode": "setSize", "width": 600 },
    { "id": "inst:<foldablePlacementId>", "objectType": "card", "mode": "setFolded", "isFolded": false }
  ]
}
```

Use `fitToContent` for content meant to be read on the canvas and `defaultSize` for long sources or previews. Media normally sets one dimension to preserve aspect ratio. Do not include the same object twice in one resize call. Fit a containing Section in a later call after its members change.

Color input uses `updates` with `yellow`, `red`, `blue`, `green`, `black`, `orange`, `purple`, or `white`:

```bash
heptabase whiteboard recolor-objects --input input.json
```

```json
{
  "whiteboardId": "<whiteboardId>",
  "updates": [{ "id": "inst:<placementId>", "objectType": "card", "color": "blue" }]
}
```

Remove placements without deleting source Cards:

```bash
heptabase whiteboard remove-objects --input input.json
```

```json
{
  "whiteboardId": "<whiteboardId>",
  "removals": [{ "id": "inst:<placementId>", "objectType": "card" }]
}
```

Removing a Section frame leaves its members. Create a Section only after its members are arranged:

```bash
heptabase whiteboard create-section --input input.json
```

```json
{
  "whiteboardId": "<whiteboardId>",
  "title": "Research",
  "color": "yellow",
  "objects": [{ "id": "inst:<placementId>", "objectType": "card" }]
}
```

A new Section wraps current geometry; it does not arrange scattered objects. Use Sections for meaningful scope, phase, category, or navigation.

## Connections

Read layout with `--include-connection-ids` before changing a route. Create only relationships that grouping alone does not show:

```bash
heptabase whiteboard create-connections --input input.json
```

```json
{
  "whiteboardId": "<whiteboardId>",
  "connections": [
    {
      "from": { "id": "inst:<sourcePlacementId>", "objectType": "card", "position": "right" },
      "to": { "id": "inst:<targetPlacementId>", "objectType": "card", "position": "left" },
      "direction": "oneWay",
      "routeType": "straight"
    }
  ]
}
```

Endpoint positions are `auto`, `top`, `right`, `bottom`, and `left`. Directions are `oneWay`, `twoWay`, and `none`. Routes are `straight`, `elbow`, and `curve`. Omit control points first; add the fewest needed only for a real obstacle.

Update one connection with a partial patch:

```bash
heptabase whiteboard update-connection --input input.json
```

```json
{
  "whiteboardId": "<whiteboardId>",
  "connectionId": "<connectionId>",
  "from": { "position": "right" },
  "to": { "position": "left" },
  "routeType": "straight"
}
```

After any endpoint move, resize, or route update, reread and inspect every affected route. Keep important paths traceable and avoid crossings through unrelated readable objects.

## Visual verification

Capture the whole board:

```bash
heptabase whiteboard screenshot <whiteboardId> --output <existingDirectory>/whiteboard.png
```

Capture a changed area by passing the same `focus` shape used by `read-layout`:

```bash
heptabase whiteboard screenshot --input focus.json --output <existingDirectory>/focus.png
```

The output path must end in `.png` and its parent directory must exist. Existing files are not replaced unless `--force` is set. Do not use `--force` unless replacement is intended.

Inspect the returned absolute path with the agent's image-reading tool. Check grouping, reading order, spacing, alignment, containment, route clarity, whitespace, and the complete changed area. Repair and recapture every material problem before claiming completion.

## Result handling

- Check `status`, `operationFailureReasonCode`, per-item `failureReasonCode`, warning fields, and candidate instance IDs.
- Arrangement, alignment, mind-map creation, and mind-map updates are coupled operations that fail as a unit when their structure is invalid.
- Some placement, movement, resize, color, removal, Section, and connection batches can return mixed item results. Do not silently treat partial success as completion.
- The CLI has no undo command. Use current reads, small scopes, and post-write checks.
