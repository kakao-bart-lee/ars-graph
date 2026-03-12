import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  ArsContextaBackdrop,
  ArsContextaCubeStrip,
  ArsContextaHeroArt,
  ArsContextaOverlay,
  ForceGraphCanvas,
  createArsContextaGateCardStyle,
  arsContextaPalette,
  arsContextaPreset,
  defaultStyling,
  labelStrategies,
  type ArsContextaTuning,
  type DrawEdgeArgs,
  type DrawNodeArgs,
  type GraphController,
  type GraphControllerOptions,
  type RenderNode,
} from '../../src'
import { sampleGraph } from './sampleData'

type LabelMode = 'arsContexta' | 'primaryOnly' | 'zoomed' | 'all'

type GraphTuning = {
  backgroundLift: number
  fogStrength: number
  nodeBrightness: number
  nodeSize: number
  edgeOpacity: number
  edgeWidth: number
  weakEdgeCull: number
  labelBrightness: number
  primaryWarmth: number
  particleSpeed: number
  particleSpacing: number
  particleSize: number
}

type SavedPreset = {
  atmosphere: ArsContextaTuning
  graph: GraphTuning
}

const initialAtmosphereTuning: ArsContextaTuning = {
  backgroundBrightness: 1,
  glowStrength: 1,
  fogStrength: 1,
  vignetteStrength: 1,
  cardBrightness: 1,
  cardOpacity: 1,
  graphContrast: 1,
  heroOpacity: 1,
  grainOpacity: 1,
}

const initialGraphTuning: GraphTuning = {
  backgroundLift: 1,
  fogStrength: 1,
  nodeBrightness: 1,
  nodeSize: 1,
  edgeOpacity: 1,
  edgeWidth: 1,
  weakEdgeCull: 1,
  labelBrightness: 1,
  primaryWarmth: 1,
  particleSpeed: 1,
  particleSpacing: 0.7,
  particleSize: 1,
}

const PRESET_STORAGE_KEY = 'ars-graph-lib-demo-presets'

export default function App() {
  const graphRef = useRef<GraphController | null>(null)
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>('index')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('index')
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>(['index'])
  const [alwaysShowPrimaryLabels, setAlwaysShowPrimaryLabels] = useState(true)
  const [showOverlay, setShowOverlay] = useState(true)
  const [labelMode, setLabelMode] = useState<LabelMode>('arsContexta')
  const [specialNodes, setSpecialNodes] = useState(true)
  const [atmosphereTuning, setAtmosphereTuning] = useState<ArsContextaTuning>(initialAtmosphereTuning)
  const [graphTuning, setGraphTuning] = useState<GraphTuning>(initialGraphTuning)
  const [savedPresets, setSavedPresets] = useState<Record<string, SavedPreset>>({})
  const [presetName, setPresetName] = useState('')
  const [selectedPresetName, setSelectedPresetName] = useState('')

  const gateCardStyle = useMemo(() => createArsContextaGateCardStyle(atmosphereTuning), [atmosphereTuning])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PRESET_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Record<string, SavedPreset>
      setSavedPresets(parsed)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(savedPresets))
    } catch {}
  }, [savedPresets])

  const options = useMemo<Partial<GraphControllerOptions>>(
    () => ({
      ...arsContextaPreset({
        ...atmosphereTuning,
        graphContrast: atmosphereTuning.graphContrast * graphTuning.nodeBrightness,
      }),
      alwaysShowPrimaryLabels,
      edgeKinds: {
        weak: {
          widthMultiplier: 0.5 * graphTuning.edgeWidth,
          opacityBoost: 0.9 * graphTuning.edgeOpacity,
          particleCount: 0,
          cullDistance: 220 * graphTuning.weakEdgeCull,
        },
        strong: {
          widthMultiplier: 1 * graphTuning.edgeWidth,
          opacityBoost: 1.08 * graphTuning.edgeOpacity,
          particleCount: 1,
        },
        default: {
          widthMultiplier: 1 * graphTuning.edgeWidth,
          opacityBoost: 1.02 * graphTuning.edgeOpacity,
        },
      },
      styling: {
        ...defaultStyling,
        nodeRadius: (node) => defaultStyling.nodeRadius(node) * graphTuning.nodeSize,
        labelText: defaultStyling.labelText,
        showLabel: labelStrategies[labelMode],
        labelFontSize: (node, context) => Math.round(defaultStyling.labelFontSize(node, context) * Math.max(0.85, graphTuning.labelBrightness)),
        drawNode: specialNodes
          ? ({ ctx, node, state, radius, screen, theme }: DrawNodeArgs) => {
              const alphaBase = node.isPrimary ? 0.84 : 0.7
              const alpha = Math.min(0.98, alphaBase * state.opacity * graphTuning.nodeBrightness)
              const accent = node.isPrimary
                ? `rgba(${theme.accentRgb}, ${Math.min(0.98, (0.88 * graphTuning.primaryWarmth) * state.opacity)})`
                : `rgba(${theme.nodeRgb}, ${alpha})`

              if (node.isPrimary) {
                ctx.beginPath()
                ctx.arc(screen.x, screen.y, radius + 1.8, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(${theme.accentRgb}, ${0.18 * state.opacity * graphTuning.primaryWarmth})`
                ctx.fill()
              }

              ctx.beginPath()
              ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2)
              ctx.fillStyle = accent
              ctx.fill()

              if (state.focused) {
                ctx.beginPath()
                ctx.arc(screen.x, screen.y, radius + 4, 0, Math.PI * 2)
                ctx.strokeStyle = `rgba(${theme.accentRgb}, ${0.58 * state.opacity})`
                ctx.lineWidth = 1
                ctx.stroke()
              }
              return true
            }
          : undefined,
        drawEdge: specialNodes
          ? ({ ctx, source, target, theme, state, kindStyle, now, edgeIndex }: DrawEdgeArgs) => {
              ctx.beginPath()
              ctx.moveTo(source.x, source.y)
              ctx.lineTo(target.x, target.y)
              const alpha = ((kindStyle.weak ? 0.024 : 0.042) + state.opacity * 0.06) * graphTuning.edgeOpacity
              ctx.strokeStyle = `rgba(${theme.edgeRgb}, ${alpha})`
              ctx.lineWidth = (kindStyle.weak ? 0.55 : 1.15) * graphTuning.edgeWidth
              ctx.stroke()

              if (!kindStyle.weak && kindStyle.particleCount > 0 && state.opacity > 0.2) {
                for (let particleIndex = 0; particleIndex < kindStyle.particleCount; particleIndex += 1) {
                  const spacing = Math.max(0.05, Math.min(0.95, graphTuning.particleSpacing))
                  const t = ((0.00055 * graphTuning.particleSpeed * now) + ((0.618 * edgeIndex) % 1) + particleIndex * spacing) % 1
                  const px = source.x + (target.x - source.x) * t
                  const py = source.y + (target.y - source.y) * t
                  ctx.beginPath()
                  ctx.arc(px, py, 1.55 * graphTuning.edgeWidth * graphTuning.particleSize, 0, Math.PI * 2)
                  ctx.fillStyle = `rgba(${theme.edgeRgb}, ${Math.min(0.95, 0.28 * state.opacity * graphTuning.edgeOpacity)})`
                  ctx.fill()
                }
              }
              return true
            }
          : undefined,
      },
    }),
    [alwaysShowPrimaryLabels, atmosphereTuning, graphTuning, labelMode, specialNodes],
  )

  const handleNodeClick = (node: RenderNode) => {
    setSelectedNodeId(node.id)
    setHighlightedNodeIds([node.id])
  }

  const handleNodeDoubleClick = (node: RenderNode) => {
    setFocusedNodeId(node.id)
    setSelectedNodeId(node.id)
    setHighlightedNodeIds([
      node.id,
      ...sampleGraph.edges
        .filter((edge) => edge.source === node.id || edge.target === node.id)
        .flatMap((edge) => [edge.source, edge.target]),
    ])
  }

  return (
    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '400px 1fr', height: '100%', background: arsContextaPalette.backgroundDeep }}>
      <ArsContextaBackdrop tuning={atmosphereTuning} />
      <aside
        style={{
          position: 'relative',
          zIndex: 1,
          borderRight: '1px solid rgba(255,255,255,0.08)',
          padding: 20,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))',
          overflow: 'auto',
          backdropFilter: 'blur(6px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, marginTop: -4 }}>
          <ArsContextaHeroArt size={220} opacity={0.92} assetBasePath="/arscontexta" tuning={atmosphereTuning} />
        </div>
        <h1 style={{ margin: 0, fontSize: 18, textAlign: 'center' }}>ars-graph-lib demo</h1>
        <ArsContextaCubeStrip assetBasePath="/arscontexta" style={{ justifyContent: 'center', marginTop: 8, marginBottom: 6 }} />
        <p style={{ color: 'rgba(245,240,232,0.78)', fontSize: 13, lineHeight: 1.6, textAlign: 'center' }}>
          맞습니다. 핵심은 카드가 아니라 그래프 자체였어요. 아래는 그래프 전용 튜닝 패널입니다, nya.
        </p>

        <section style={{ ...sectionCardStyle(gateCardStyle), marginTop: 20, display: 'grid', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.74)' }}>Graph tuning</div>
          <Range label="Graph background lift" value={graphTuning.backgroundLift} min={0.6} max={1.8} step={0.01} onChange={(value) => setGraphTuning((prev) => ({ ...prev, backgroundLift: value }))} />
          <Range label="Graph fog strength" value={graphTuning.fogStrength} min={0.4} max={1.8} step={0.01} onChange={(value) => setGraphTuning((prev) => ({ ...prev, fogStrength: value }))} />
          <Range label="Node brightness" value={graphTuning.nodeBrightness} min={0.6} max={1.8} step={0.01} onChange={(value) => setGraphTuning((prev) => ({ ...prev, nodeBrightness: value }))} />
          <Range label="Node size" value={graphTuning.nodeSize} min={0.7} max={1.6} step={0.01} onChange={(value) => setGraphTuning((prev) => ({ ...prev, nodeSize: value }))} />
          <Range label="Edge opacity" value={graphTuning.edgeOpacity} min={0.4} max={2} step={0.01} onChange={(value) => setGraphTuning((prev) => ({ ...prev, edgeOpacity: value }))} />
          <Range label="Edge width" value={graphTuning.edgeWidth} min={0.5} max={2} step={0.01} onChange={(value) => setGraphTuning((prev) => ({ ...prev, edgeWidth: value }))} />
          <Range label="Weak-edge culling" value={graphTuning.weakEdgeCull} min={0.5} max={2} step={0.01} onChange={(value) => setGraphTuning((prev) => ({ ...prev, weakEdgeCull: value }))} />
          <Range label="Label brightness/size" value={graphTuning.labelBrightness} min={0.7} max={1.5} step={0.01} onChange={(value) => setGraphTuning((prev) => ({ ...prev, labelBrightness: value }))} />
          <Range label="Primary warmth" value={graphTuning.primaryWarmth} min={0.6} max={1.8} step={0.01} onChange={(value) => setGraphTuning((prev) => ({ ...prev, primaryWarmth: value }))} />
          <Range label="Particle speed" value={graphTuning.particleSpeed} min={0.4} max={2.5} step={0.01} onChange={(value) => setGraphTuning((prev) => ({ ...prev, particleSpeed: value }))} />
          <Range label="Particle spacing" value={graphTuning.particleSpacing} min={0.1} max={0.95} step={0.01} onChange={(value) => setGraphTuning((prev) => ({ ...prev, particleSpacing: value }))} />
          <Range label="Particle size" value={graphTuning.particleSize} min={0.6} max={2} step={0.01} onChange={(value) => setGraphTuning((prev) => ({ ...prev, particleSize: value }))} />
          <button onClick={() => setGraphTuning(initialGraphTuning)} style={buttonStyle(gateCardStyle)}>Reset graph tuning</button>
        </section>

        <section style={{ ...sectionCardStyle(gateCardStyle), marginTop: 20, display: 'grid', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.74)' }}>Page atmosphere tuning</div>
          <Range label="Background brightness" value={atmosphereTuning.backgroundBrightness} min={0.75} max={1.35} step={0.01} onChange={(value) => setAtmosphereTuning((prev) => ({ ...prev, backgroundBrightness: value }))} />
          <Range label="Glow strength" value={atmosphereTuning.glowStrength} min={0.4} max={1.8} step={0.01} onChange={(value) => setAtmosphereTuning((prev) => ({ ...prev, glowStrength: value }))} />
          <Range label="Fog strength" value={atmosphereTuning.fogStrength} min={0.3} max={1.8} step={0.01} onChange={(value) => setAtmosphereTuning((prev) => ({ ...prev, fogStrength: value }))} />
          <Range label="Vignette strength" value={atmosphereTuning.vignetteStrength} min={0.5} max={1.6} step={0.01} onChange={(value) => setAtmosphereTuning((prev) => ({ ...prev, vignetteStrength: value }))} />
          <Range label="Card brightness" value={atmosphereTuning.cardBrightness} min={0.5} max={1.5} step={0.01} onChange={(value) => setAtmosphereTuning((prev) => ({ ...prev, cardBrightness: value }))} />
          <Range label="Card opacity" value={atmosphereTuning.cardOpacity} min={0.5} max={1.5} step={0.01} onChange={(value) => setAtmosphereTuning((prev) => ({ ...prev, cardOpacity: value }))} />
          <Range label="Hero opacity" value={atmosphereTuning.heroOpacity} min={0.3} max={1.8} step={0.01} onChange={(value) => setAtmosphereTuning((prev) => ({ ...prev, heroOpacity: value }))} />
          <Range label="Grain opacity" value={atmosphereTuning.grainOpacity} min={0} max={2} step={0.01} onChange={(value) => setAtmosphereTuning((prev) => ({ ...prev, grainOpacity: value }))} />
          <button onClick={() => setAtmosphereTuning(initialAtmosphereTuning)} style={buttonStyle(gateCardStyle)}>Reset atmosphere</button>
        </section>

        <section style={{ ...sectionCardStyle(gateCardStyle), marginTop: 20, display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.74)' }}>Preset save / load</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="preset name"
              style={{ ...selectStyle(gateCardStyle), flex: 1 }}
            />
            <button
              onClick={() => {
                const name = presetName.trim()
                if (!name) return
                setSavedPresets((prev) => ({
                  ...prev,
                  [name]: { atmosphere: atmosphereTuning, graph: graphTuning },
                }))
                setSelectedPresetName(name)
              }}
              style={buttonStyle(gateCardStyle)}
            >
              Save
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={selectedPresetName} onChange={(e) => setSelectedPresetName(e.target.value)} style={{ ...selectStyle(gateCardStyle), flex: 1 }}>
              <option value="">select preset</option>
              {Object.keys(savedPresets).sort().map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button
              onClick={() => {
                const preset = savedPresets[selectedPresetName]
                if (!preset) return
                setAtmosphereTuning(preset.atmosphere)
                setGraphTuning(preset.graph)
              }}
              style={buttonStyle(gateCardStyle)}
            >
              Load
            </button>
            <button
              onClick={() => {
                if (!selectedPresetName) return
                setSavedPresets((prev) => {
                  const next = { ...prev }
                  delete next[selectedPresetName]
                  return next
                })
                setSelectedPresetName('')
              }}
              style={buttonStyle(gateCardStyle)}
            >
              Delete
            </button>
          </div>
        </section>

        <section style={{ ...sectionCardStyle(gateCardStyle), marginTop: 20, display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => graphRef.current?.fitToView()} style={buttonStyle(gateCardStyle)}>fitToView()</button>
            <button onClick={() => focusedNodeId && graphRef.current?.centerOnNode(focusedNodeId, { animate: true, zoom: 1.4 })} style={buttonStyle(gateCardStyle)}>centerOnNode()</button>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.6)' }}>모바일에서는 두 손가락 pinch zoom 도 지원합니다.</div>
        </section>

        <section style={{ ...sectionCardStyle(gateCardStyle), marginTop: 20 }}>
          <div style={{ fontSize: 12, marginBottom: 8, color: 'rgba(245,240,232,0.7)' }}>Controlled focus</div>
          <select value={focusedNodeId ?? ''} onChange={(event) => setFocusedNodeId(event.target.value || null)} style={selectStyle(gateCardStyle)}>
            <option value="">none</option>
            {sampleGraph.nodes.map((node) => <option key={node.id} value={node.id}>{node.label ?? node.id}</option>)}
          </select>
        </section>

        <section style={{ ...sectionCardStyle(gateCardStyle), marginTop: 20 }}>
          <div style={{ fontSize: 12, marginBottom: 8, color: 'rgba(245,240,232,0.7)' }}>Controlled selection</div>
          <select value={selectedNodeId ?? ''} onChange={(event) => setSelectedNodeId(event.target.value || null)} style={selectStyle(gateCardStyle)}>
            <option value="">none</option>
            {sampleGraph.nodes.map((node) => <option key={node.id} value={node.id}>{node.label ?? node.id}</option>)}
          </select>
        </section>

        <section style={{ ...sectionCardStyle(gateCardStyle), marginTop: 20 }}>
          <div style={{ fontSize: 12, marginBottom: 8, color: 'rgba(245,240,232,0.7)' }}>Quick highlight</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {sampleGraph.nodes.map((node) => (
              <button
                key={node.id}
                onClick={() => setHighlightedNodeIds([node.id])}
                style={{
                  ...pillStyle(gateCardStyle),
                  background: highlightedNodeIds.includes(node.id) ? 'rgba(172,121,87,0.35)' : gateCardStyle.background,
                }}
              >
                {node.label ?? node.id}
              </button>
            ))}
          </div>
        </section>

        <section style={{ ...sectionCardStyle(gateCardStyle), marginTop: 20, display: 'grid', gap: 14 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 12 }}>
            <span>Label strategy</span>
            <select value={labelMode} onChange={(e) => setLabelMode(e.target.value as LabelMode)} style={selectStyle(gateCardStyle)}>
              <option value="arsContexta">arsContexta</option>
              <option value="primaryOnly">primaryOnly</option>
              <option value="zoomed">zoomed</option>
              <option value="all">all</option>
            </select>
          </label>
          <label style={checkboxStyle}><input type="checkbox" checked={alwaysShowPrimaryLabels} onChange={(e) => setAlwaysShowPrimaryLabels(e.target.checked)} />Always show primary labels</label>
          <label style={checkboxStyle}><input type="checkbox" checked={showOverlay} onChange={(e) => setShowOverlay(e.target.checked)} />Show overlay card</label>
          <label style={checkboxStyle}><input type="checkbox" checked={specialNodes} onChange={(e) => setSpecialNodes(e.target.checked)} />Enable custom drawNode / drawEdge hooks</label>
        </section>
      </aside>

      <main style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `radial-gradient(circle at 50% 22%, rgba(244,241,236,${0.09 * graphTuning.backgroundLift}) 0%, rgba(210,201,188,${0.07 * graphTuning.backgroundLift}) 12%, rgba(172,121,87,${0.06 * graphTuning.backgroundLift}) 20%, rgba(0,0,0,0) 46%), radial-gradient(circle at 50% 68%, rgba(255,255,255,${0.045 * graphTuning.fogStrength}) 0%, rgba(255,255,255,${0.01 * graphTuning.fogStrength}) 26%, rgba(0,0,0,0) 46%), radial-gradient(circle at center, transparent 40%, rgba(0,0,0,${0.14 * atmosphereTuning.vignetteStrength}) 76%, rgba(0,0,0,${0.32 * atmosphereTuning.vignetteStrength}) 100%)`,
            filter: `brightness(${atmosphereTuning.backgroundBrightness})`,
          }}
        />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'grid', placeItems: 'center' }}>
          <ArsContextaHeroArt size={540} opacity={0.24} assetBasePath="/arscontexta" tuning={atmosphereTuning} />
        </div>
        <div style={{ position: 'absolute', left: 24, right: 24, top: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
          <ArsContextaCubeStrip assetBasePath="/arscontexta" count={8} style={{ opacity: 0.75 }} />
          <ArsContextaCubeStrip assetBasePath="/arscontexta" count={8} style={{ opacity: 0.75 }} />
        </div>
        <ForceGraphCanvas
          ref={graphRef}
          data={sampleGraph}
          options={options}
          focusedNodeId={focusedNodeId}
          selectedNodeId={selectedNodeId}
          highlightedNodeIds={highlightedNodeIds}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onSelectedNodeChange={(node: RenderNode | null) => setSelectedNodeId(node?.id ?? null)}
          onFocusedNodeChange={(node: RenderNode | null) => setFocusedNodeId(node?.id ?? null)}
          renderOverlay={showOverlay ? (payload) => <ArsContextaOverlay {...payload} /> : undefined}
        />
      </main>
    </div>
  )
}

function Range({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <label style={{ display: 'grid', gap: 6, fontSize: 12 }}>
      <span>{label}: {value.toFixed(2)}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}

const checkboxStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }
const sectionCardStyle = (card: CSSProperties): CSSProperties => ({ ...card, padding: 14 })
const buttonStyle = (card: CSSProperties): CSSProperties => ({ ...card, padding: '8px 10px', borderRadius: 8, color: '#f5f0e8', cursor: 'pointer', fontSize: 12 })
const selectStyle = (card: CSSProperties): CSSProperties => ({ ...card, width: '100%', padding: '8px 10px', color: '#f5f0e8', borderRadius: 8 })
const pillStyle = (card: CSSProperties): CSSProperties => ({ ...card, padding: '6px 10px', borderRadius: 999, color: '#f5f0e8', cursor: 'pointer', fontSize: 11 })
