export type GraphNodeInput<T = unknown> = {
  id: string
  label?: string
  kind?: string
  group?: string
  data?: T
  isPrimary?: boolean
  radius?: number
}

export type GraphEdgeInput<T = unknown> = {
  id?: string
  source: string
  target: string
  kind?: string
  data?: T
}

export type CameraTransform = {
  x: number
  y: number
  k: number
}

export type ScreenPoint = {
  x: number
  y: number
}

export type WorldPoint = {
  x: number
  y: number
}

export type RenderNode<T = unknown> = GraphNodeInput<T> & {
  index: number
  degree: number
  x: number
  y: number
  vx: number
  vy: number
  fx?: number | null
  fy?: number | null
  entryStart: number
  entryT: number
}

export type RenderEdge<T = unknown> = GraphEdgeInput<T> & {
  id: string
  source: RenderNode
  target: RenderNode
  kind: string
  isWeak: boolean
}

export type GraphDataset<TNode = unknown, TEdge = unknown> = {
  nodes: GraphNodeInput<TNode>[]
  edges: GraphEdgeInput<TEdge>[]
}

export type NodeState = {
  focused: boolean
  hovered: boolean
  selected: boolean
  highlighted: boolean
  neighbor: boolean
  zoom: number
  opacity: number
}

export type EdgeState = {
  focused: boolean
  highlighted: boolean
  weak: boolean
  zoom: number
  opacity: number
}

export type GraphTheme = {
  background: string
  edgeRgb: string
  nodeRgb: string
  accentRgb: string
  labelRgb: string
  fontFamily: string
}

export type EdgeKindStyle = {
  weak: boolean
  distance: number
  strength: number
  widthMultiplier: number
  particleCount: number
  cullDistance?: number
  opacityBoost: number
}

export type EdgeKindPresetMap = Record<string, Partial<EdgeKindStyle>>

export type GraphLayoutOptions = {
  chargeStrength: number
  chargeDistanceMax: number
  centerStrength: number
  linkDistance: (edge: RenderEdge, kindStyle: EdgeKindStyle) => number
  linkStrength: (edge: RenderEdge, kindStyle: EdgeKindStyle) => number
  collisionRadius: (node: RenderNode) => number
  alphaDecay: number
  alphaMin: number
  velocityDecay: number
}

export type GraphInteractionOptions = {
  minZoom: number
  maxZoom: number
  doubleClickMs: number
  dragThreshold: number
  zoomStep: number
  draggableNodes: boolean
  pannable: boolean
  zoomable: boolean
  touchPinchZoom: boolean
}

export type LabelVisibilityContext = {
  zoom: number
  focusedId: string | null
  hoveredId: string | null
  selectedId: string | null
  highlightedIds: Set<string>
  alwaysShowPrimaryLabels: boolean
}

export type LabelStrategy = (node: RenderNode, context: LabelVisibilityContext) => boolean

export type DrawNodeArgs = {
  ctx: CanvasRenderingContext2D
  node: RenderNode
  state: NodeState
  radius: number
  screen: ScreenPoint
  theme: GraphTheme
}

export type DrawEdgeArgs = {
  ctx: CanvasRenderingContext2D
  edge: RenderEdge
  state: EdgeState
  source: ScreenPoint
  target: ScreenPoint
  theme: GraphTheme
  kindStyle: EdgeKindStyle
  now: number
  edgeIndex: number
}

export type GraphStylingOptions = {
  nodeRadius: (node: RenderNode) => number
  nodeColor: (node: RenderNode, state: NodeState, theme: GraphTheme) => string
  edgeColor: (edge: RenderEdge, state: EdgeState, theme: GraphTheme, kindStyle: EdgeKindStyle) => string
  edgeWidth: (edge: RenderEdge, state: EdgeState, kindStyle: EdgeKindStyle) => number
  labelText: (node: RenderNode) => string
  showLabel: LabelStrategy
  labelFontSize: (node: RenderNode, context: LabelVisibilityContext) => number
  edgeParticleDensity: number
  weakEdgeCullDistance: number
  drawNode?: (args: DrawNodeArgs) => boolean | void
  drawEdge?: (args: DrawEdgeArgs) => boolean | void
  /** Degree threshold for hub nodes (accent color, larger radius, always-on label). Default: 8 */
  hubDegreeThreshold: number
  /** Particle travel speed multiplier. 1.0 = default, 0.5 = half speed. Default: 1.0 */
  particleSpeed: number
  /** Brightness levels: [faded, normal, focused]. Default: [0.08, 0.54, 1.0] */
  brightness: [number, number, number]
  /** Reduce anti-aliasing for crisper edges. Default: false */
  crispEdges: boolean
}

export type GraphControllerOptions = {
  theme: GraphTheme
  layout: GraphLayoutOptions
  interaction: GraphInteractionOptions
  styling: GraphStylingOptions
  edgeKinds: EdgeKindPresetMap
  alwaysShowPrimaryLabels: boolean
}

export type GraphSnapshot = {
  selectedId: string | null
  hoveredId: string | null
  focusedId: string | null
  highlightedIds: Set<string>
  camera: CameraTransform
}

export type NodeOverlayPayload<T = unknown> = {
  node: RenderNode<T>
  screen: ScreenPoint
  neighborCount: number
}

export type FitViewOptions = {
  padding?: number
  minZoom?: number
  maxZoom?: number
  includeIds?: Iterable<string>
}

export type CenterOnNodeOptions = {
  zoom?: number
  animate?: boolean
}
