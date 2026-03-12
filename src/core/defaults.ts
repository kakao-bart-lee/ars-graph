import type {
  EdgeKindPresetMap,
  EdgeKindStyle,
  GraphControllerOptions,
  GraphInteractionOptions,
  GraphLayoutOptions,
  GraphStylingOptions,
  GraphTheme,
  LabelStrategy,
  RenderNode,
} from './types'

export const defaultTheme: GraphTheme = {
  background: '#060706',
  edgeRgb: '245, 240, 232',
  nodeRgb: '245, 240, 232',
  accentRgb: '180, 150, 100',
  labelRgb: '245, 240, 232',
  fontFamily: `"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace`,
}

const radius = (node: RenderNode) => Math.max(3, Math.min(12, 2.5 + 1.4 * Math.sqrt(node.degree || 1)))

export const defaultEdgeKinds: EdgeKindPresetMap = {
  default: {
    weak: false,
    distance: 90,
    strength: 0.15,
    widthMultiplier: 1,
    particleCount: 1,
    opacityBoost: 1,
  },
  strong: {
    weak: false,
    distance: 90,
    strength: 0.15,
    widthMultiplier: 1,
    particleCount: 1,
    opacityBoost: 1,
  },
  weak: {
    weak: true,
    distance: 140,
    strength: 0.04,
    widthMultiplier: 0.5,
    particleCount: 0,
    cullDistance: 220,
    opacityBoost: 0.9,
  },
  wikilink: {
    weak: true,
    distance: 140,
    strength: 0.04,
    widthMultiplier: 0.5,
    particleCount: 0,
    cullDistance: 220,
    opacityBoost: 0.9,
  },
}

export const resolveEdgeKindStyle = (kind: string | undefined, overrides?: EdgeKindPresetMap): EdgeKindStyle => {
  const key = kind ?? 'default'
  const base = defaultEdgeKinds[key] ?? defaultEdgeKinds.default
  const merged = { ...base, ...(overrides?.[key] ?? {}) }
  return {
    weak: merged.weak ?? false,
    distance: merged.distance ?? 90,
    strength: merged.strength ?? 0.15,
    widthMultiplier: merged.widthMultiplier ?? 1,
    particleCount: merged.particleCount ?? 1,
    cullDistance: merged.cullDistance,
    opacityBoost: merged.opacityBoost ?? 1,
  }
}

export const defaultLayout: GraphLayoutOptions = {
  chargeStrength: -150,
  chargeDistanceMax: 450,
  centerStrength: 0.02,
  linkDistance: (_, kindStyle) => kindStyle.distance,
  linkStrength: (_, kindStyle) => kindStyle.strength,
  collisionRadius: (node: RenderNode) => radius(node) + 4,
  alphaDecay: 0.008,
  alphaMin: 0.005,
  velocityDecay: 0.35,
}

export const defaultInteraction: GraphInteractionOptions = {
  minZoom: 0.15,
  maxZoom: 6,
  doubleClickMs: 400,
  dragThreshold: 4,
  zoomStep: 0.08,
  draggableNodes: true,
  pannable: true,
  zoomable: true,
  touchPinchZoom: true,
}

export const labelStrategies: Record<'arsContexta' | 'primaryOnly' | 'zoomed' | 'all', LabelStrategy> = {
  arsContexta: (node, ctx) => {
    if (node.id === ctx.focusedId || node.id === ctx.hoveredId || node.id === ctx.selectedId) return true
    if (ctx.highlightedIds.has(node.id)) return true
    if (ctx.zoom > 1.8) return true
    // Show labels for hub nodes (high degree) and primary nodes
    const isHub = node.isPrimary || node.degree >= 6
    if (isHub) return true
    if (ctx.zoom > 0.6 && node.isPrimary) return true
    return ctx.alwaysShowPrimaryLabels && !!node.isPrimary
  },
  primaryOnly: (node, ctx) => node.isPrimary === true || node.id === ctx.focusedId || node.id === ctx.hoveredId,
  zoomed: (_, ctx) => ctx.zoom > 1.6,
  all: () => true,
}

export const defaultStyling: GraphStylingOptions = {
  nodeRadius: radius,
  nodeColor: (node, state, theme) => {
    const rgb = node.isPrimary ? theme.accentRgb : theme.nodeRgb
    const alpha = (node.isPrimary ? 0.82 : 0.66) * state.opacity
    return `rgba(${rgb}, ${alpha})`
  },
  edgeColor: (_, state, theme, kindStyle) => {
    const alphaBase = kindStyle.weak ? 0.032 : 0.045
    const alpha = (alphaBase + state.opacity * 0.06) * kindStyle.opacityBoost
    return `rgba(${theme.edgeRgb}, ${alpha})`
  },
  edgeWidth: (_, state, kindStyle) => kindStyle.widthMultiplier * (state.highlighted ? 1.8 : 1),
  labelText: (node) => node.label ?? node.id,
  showLabel: labelStrategies.arsContexta,
  labelFontSize: (node, ctx) => {
    if (node.id === ctx.hoveredId) return 12
    if (node.id === ctx.focusedId) return 11
    return node.isPrimary ? 10 : 9
  },
  edgeParticleDensity: 1,
  weakEdgeCullDistance: 220,
}

export const defaultOptions: GraphControllerOptions = {
  theme: defaultTheme,
  layout: defaultLayout,
  interaction: defaultInteraction,
  styling: defaultStyling,
  edgeKinds: defaultEdgeKinds,
  alwaysShowPrimaryLabels: true,
}
