# ars-graph-lib

Canvas-based force graph library inspired by arscontexta's explore view.

What is included right now:
- force layout using d3-force
- quadtree hit testing
- canvas renderer with arscontexta-like weak/strong edges
- hover, click, double-click, drag, pan, wheel zoom, touch pinch zoom
- React wrapper with imperative controller ref
- controlled selection / focus support
- fitToView() and centerOnNode()
- custom drawNode / drawEdge hooks
- edge kind preset system and label strategy presets
- arsContexta preset and overlay
- configurable hub node detection
- 3-level brightness system
- transparent background support
- local Vite + React demo playground in `demo/`

## Install

```bash
npm install ars-graph-lib
```

## Demo playground

```bash
npm install
npm run dev
```

Then open the local Vite URL and explore the graph demo.

Build only the demo:

```bash
npm run build:demo
```

## Example

```tsx
import { ForceGraphCanvas, arsContextaPreset, ArsContextaOverlay } from 'ars-graph-lib'

const data = {
  nodes: [
    { id: 'index', label: 'index', isPrimary: true, data: { description: 'Root note' } },
    { id: 'topic-a', label: 'topic-a', isPrimary: true, data: { description: 'Main topic' } },
    { id: 'note-1', label: 'note-1', data: { description: 'Connected note' } },
  ],
  edges: [
    { source: 'index', target: 'topic-a', kind: 'strong' },
    { source: 'topic-a', target: 'note-1', kind: 'weak' },
  ],
}

// Override default styling options
const options = {
  ...arsContextaPreset(),
  theme: { ...arsContextaPreset().theme, background: 'transparent' },
  styling: {
    ...arsContextaPreset().styling,
    hubDegreeThreshold: 8,
    crispEdges: true,
    brightness: [0.06, 0.4, 1.0],
  },
}

export default function Demo() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <ForceGraphCanvas
        data={data}
        options={options}
        focusedNodeId="index"
        renderOverlay={(payload) => <ArsContextaOverlay {...payload} />}
      />
    </div>
  )
}
```

## Configurable Styling Options

The `styling` field in `GraphStylingOptions` allows fine-grained control over visual behavior.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `hubDegreeThreshold` | `number` | `10` | Degree threshold for hub nodes. Nodes with degree >= this value receive accent color, larger radius, a glow ring, and always-on labels. |
| `particleSpeed` | `number` | `1.0` | Particle travel speed multiplier. `0.5` = half speed, `2.0` = double speed. |
| `brightness` | `[number, number, number]` | `[0.08, 0.38, 1.0]` | Brightness levels tuple: `[faded, normal, focused]`. Controls opacity for inactive, default, and active states respectively. |
| `crispEdges` | `boolean` | `false` | Reduce anti-aliasing for crisper edge rendering. |

### Example: adjusting hub detection sensitivity

Lowering `hubDegreeThreshold` causes more nodes to be treated as hubs, giving them visual prominence earlier:

```ts
const options = {
  ...arsContextaPreset(),
  styling: {
    ...arsContextaPreset().styling,
    hubDegreeThreshold: 5,
  },
}
```

### Example: tuning brightness levels

The three-element `brightness` tuple controls the opacity at each interaction state:

- **Index 0 — faded**: opacity applied to nodes/edges that are not part of the current focus neighborhood.
- **Index 1 — normal**: default opacity when nothing is focused.
- **Index 2 — focused**: opacity for the focused node and its direct neighbors.

```ts
styling: {
  brightness: [0.05, 0.35, 1.0], // more contrast between states
}
```

## Transparent Background

Set `theme.background` to `'transparent'` to layer the graph over custom backgrounds. This is useful when embedding the graph inside styled containers, gradient backgrounds, or image backdrops.

```ts
const options = {
  ...arsContextaPreset(),
  theme: {
    ...arsContextaPreset().theme,
    background: 'transparent',
  },
}
```
