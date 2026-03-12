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

export default function Demo() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <ForceGraphCanvas
        data={data}
        options={arsContextaPreset()}
        focusedNodeId="index"
        renderOverlay={(payload) => <ArsContextaOverlay {...payload} />}
      />
    </div>
  )
}
```
