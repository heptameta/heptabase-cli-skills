# Mind maps

Read this together with `whiteboard.md`. A mind map is an editable rooted tree with stable structural node IDs.

## Design defaults

- Design the semantic tree before choosing rich node types.
- Use one concise text root.
- Use mostly short `textNode` labels, with one concept per node and parallel wording among siblings.
- Default to 4–7 top-level branches, 2–4 levels, and about 20–50 nodes. The 300-node limit is a ceiling, not a target.
- Default to horizontal layout. Omit side, edge color, and collapsed state unless the user or existing map calls for them.
- For updates, preserve the map's current wording, depth, node mix, layout, colors, sides, and collapsed state. Make the smallest requested change.

## Node types

| Type | Use |
| --- | --- |
| `textNode` | Default concise label owned by the mind map. Plain text only. |
| `cardNode` | A regular Card whose independent identity matters. It may create a Card, reference one, or consume a Card placement. Only regular Cards are supported; PDF, web, media, and journal sources are not. |
| `highlightElementNode` | Consume an existing standalone Highlight Element placement. The command cannot create a new Highlight Element. |
| `textElementNode` | Create a visual Text Element or consume an existing standalone Text Element placement. |

Build the full text-node skeleton first. Use rich nodes only where added detail or independent identity matters.

## Create a mind map

Create one complete flat, ordered tree with `create-mind-map --input <path|->`:

```bash
heptabase whiteboard create-mind-map --input input.json
```

```json
{
  "whiteboardId": "<whiteboardId>",
  "layout": "horizontal",
  "destination": { "type": "auto" },
  "nodes": [
    {
      "nodeKey": "root",
      "parentNodeKey": null,
      "node": { "type": "textNode", "content": "Customer onboarding" }
    },
    {
      "nodeKey": "activation",
      "parentNodeKey": "root",
      "node": { "type": "textNode", "content": "Activation" }
    },
    {
      "nodeKey": "first-value",
      "parentNodeKey": "activation",
      "node": { "type": "textNode", "content": "First value" }
    },
    {
      "nodeKey": "risks",
      "parentNodeKey": "root",
      "node": { "type": "textNode", "content": "Risks" }
    }
  ]
}
```

Rules:

- `nodeKey` is unique within the call.
- Exactly one node has `parentNodeKey: null`.
- Every other parent key must exist, and the graph must be connected and acyclic.
- Array order is sibling order under each parent.
- `side: "left"` or `"right"` is meaningful only on a direct child of the root. Omit it to balance branches automatically.
- `edgeColor` accepts `yellow`, `red`, `blue`, `green`, `black`, `orange`, `purple`, or `white`; normally omit it.

## Rich node definitions

Create a reusable Card:

```json
{
  "type": "cardNode",
  "source": {
    "type": "newCard",
    "content": "# Activation evidence\n\nDetailed explanation"
  }
}
```

Reference a regular Card without consuming a whiteboard placement:

```json
{
  "type": "cardNode",
  "source": { "type": "existingCard", "cardId": "<cardId>" }
}
```

Consume one current Card placement into the map:

```json
{
  "type": "cardNode",
  "source": { "type": "cardInstance", "id": "inst:<placementId>" }
}
```

Consume a Highlight Element placement:

```json
{
  "type": "highlightElementNode",
  "source": { "type": "highlightElementInstance", "id": "inst:<placementId>" }
}
```

Create or consume a Text Element:

```json
{
  "type": "textElementNode",
  "source": { "type": "newTextElement", "content": "**Supporting detail**" }
}
```

```json
{
  "type": "textElementNode",
  "source": { "type": "textElement", "id": "inst:<placementId>" }
}
```

Before consuming a placement, read the target whiteboard layout and use its exact `inst:` ID when available. Consuming turns that standalone placement into a structural node and can change its Section membership and connected relations. Do not consume an object merely to copy its text.

## Read before updating

Use the canonical `mindMapId`, not the Mind Map Instance ID:

```bash
heptabase object read mindMap <mindMapId>
```

Copy current structural `mindMapNodeId` values from that output. Do not reuse node IDs from an old read after another edit.

## Update operations

`update-mind-map` takes an ordered operation list:

```bash
heptabase whiteboard update-mind-map --input input.json
```

```json
{
  "mindMapId": "<mindMapId>",
  "operations": [
    {
      "operation": "addNode",
      "nodeKey": "risk-mitigation",
      "parent": { "type": "existingNode", "mindMapNodeId": "<risksNodeId>" },
      "position": { "type": "last" },
      "node": { "type": "textNode", "content": "Mitigation" }
    },
    {
      "operation": "setCollapsed",
      "target": { "type": "newNode", "nodeKey": "risk-mitigation" },
      "isCollapsed": true
    }
  ]
}
```

Operations run sequentially. A `newNode` reference may target only an earlier `addNode` in the same call.

Supported operations:

| Operation | Important fields |
| --- | --- |
| `addNode` | `nodeKey`, `parent`, optional `position`, `side`, `edgeColor`, and `node` |
| `updateTextNode` | `target`, complete replacement plain-text `content`; only for `textNode` |
| `moveNode` | `target`, new `parent`, optional `position` and root-child `side` |
| `deleteSubtree` | `target`; deletes it and all descendants, but cannot delete the root |
| `setLayout` | `layout`: `horizontal` or `vertical` |
| `setCollapsed` | `target`, `isCollapsed` |
| `setEdgeColor` | non-root `target`, `edgeColor`; applies to its subtree |

Node references:

```json
{ "type": "existingNode", "mindMapNodeId": "<mindMapNodeId>" }
```

```json
{ "type": "newNode", "nodeKey": "<earlierNodeKey>" }
```

Sibling positions:

```json
{ "type": "first" }
```

```json
{ "type": "last" }
```

```json
{ "type": "before", "sibling": { "type": "existingNode", "mindMapNodeId": "<siblingId>" } }
```

```json
{ "type": "after", "sibling": { "type": "newNode", "nodeKey": "<earlierNodeKey>" } }
```

The root cannot be moved, deleted, or recolored with `setEdgeColor`. `updateTextNode` cannot change a node type or edit Card, Highlight Element, or Text Element content.

Deleting a Card node removes its map placement but keeps the canonical Card. Deleting a Highlight Element or Text Element node removes that attached canvas element rather than detaching it as a standalone placement.

## Atomicity and limits

- Creation and update are all-or-nothing. Invalid structure, source ambiguity, scope failure, or a bad sequential operation commits nothing.
- One update accepts at most 100 operations.
- The final map accepts at most 300 nodes.
- A compiled change above 1,000 persisted actions fails. Split a large update into smaller calls that each leave a valid map.
- Inspect `status`, `operationFailureReasonCode`, and any reported operation index, node key, source ID, or candidate instance IDs before continuing.

## Verify

After creation or update:

1. Run `heptabase object read mindMap <mindMapId>` and confirm hierarchy, order, wording, node types, and stable IDs.
2. Run `heptabase whiteboard read-layout <whiteboardId>` and `heptabase whiteboard lint <whiteboardId>`.
3. Export and inspect a focused schematic screenshot as described in `whiteboard.md`.
4. Check that surrounding objects, Sections, and connections remain correct. Repair and repeat before claiming completion.
