import { quadtree } from 'd3-quadtree'
import { resolveEdgeKindStyle } from '../core/defaults'
import type {
  DrawEdgeArgs,
  DrawNodeArgs,
  GraphControllerOptions,
  GraphSnapshot,
  LabelVisibilityContext,
  RenderEdge,
  RenderNode,
} from '../core/types'
import { easeOutCubic, worldToScreen } from '../utils/viewport'

export type DrawSceneArgs = {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  now: number
  nodes: RenderNode[]
  edges: RenderEdge[]
  snapshot: GraphSnapshot
  adjacency: Map<string, Set<string>>
  visibility: Map<string, number>
  options: GraphControllerOptions
  appearancePulse: { id: string | null; startTime: number }
}

const makeNodeState = (
  node: RenderNode,
  snapshot: GraphSnapshot,
  adjacency: Map<string, Set<string>>,
  opacity: number,
) => {
  const focused = snapshot.focusedId === node.id
  const hovered = snapshot.hoveredId === node.id
  const selected = snapshot.selectedId === node.id
  const highlighted = snapshot.highlightedIds.has(node.id)
  const neighbor = !!snapshot.hoveredId && adjacency.get(snapshot.hoveredId)?.has(node.id) === true

  return {
    focused,
    hovered,
    selected,
    highlighted,
    neighbor,
    zoom: snapshot.camera.k,
    opacity,
  }
}

const edgeOpacity = (
  edge: RenderEdge,
  snapshot: GraphSnapshot,
  adjacency: Map<string, Set<string>>,
  brightness: [number, number, number],
) => {
  const [faded, normal, focused] = brightness
  const activeId = snapshot.hoveredId ?? snapshot.selectedId
  if (!activeId && snapshot.highlightedIds.size === 0) return normal
  if (activeId && (edge.source.id === activeId || edge.target.id === activeId)) return focused
  if (snapshot.highlightedIds.has(edge.source.id) && snapshot.highlightedIds.has(edge.target.id)) return focused
  if (activeId) {
    const neighbors = adjacency.get(activeId)
    if (neighbors?.has(edge.source.id) || neighbors?.has(edge.target.id)) return (normal + focused) / 2
  }
  return faded
}

export const rebuildHitIndex = (nodes: RenderNode[]) =>
  quadtree<RenderNode>()
    .x((node) => node.x)
    .y((node) => node.y)
    .addAll(nodes.filter((node) => Number.isFinite(node.x) && Number.isFinite(node.y)))

const defaultDrawEdge = ({ ctx, state, source, target, theme, kindStyle, now, edgeIndex }: DrawEdgeArgs, particleSpeed: number) => {
  ctx.beginPath()
  ctx.moveTo(source.x, source.y)
  ctx.lineTo(target.x, target.y)
  ctx.stroke()

  if (!kindStyle.weak && kindStyle.particleCount > 0 && state.opacity > 0.2) {
    const speed = 0.0002 * particleSpeed
    for (let particleIndex = 0; particleIndex < kindStyle.particleCount; particleIndex += 1) {
      const t = ((speed * now) + ((0.618 * edgeIndex) % 1) + particleIndex * 0.5) % 1
      const px = source.x + (target.x - source.x) * t
      const py = source.y + (target.y - source.y) * t
      ctx.beginPath()
      ctx.arc(px, py, 1.2, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${theme.edgeRgb}, ${0.2 * state.opacity})`
      ctx.fill()
    }
  }
}

const defaultDrawNode = ({ ctx, node, state, radius, screen, theme }: DrawNodeArgs, hubDegreeThreshold: number) => {
  const isHub = node.isPrimary || node.degree >= hubDegreeThreshold
  const rgb = isHub ? theme.accentRgb : theme.nodeRgb

  // Opaque background circle to occlude edges behind the node
  const bgColor = theme.background === 'transparent' ? '#060706' : theme.background
  ctx.beginPath()
  ctx.arc(screen.x, screen.y, radius + 0.5, 0, Math.PI * 2)
  ctx.fillStyle = bgColor
  ctx.fill()

  // Node fill — fully opaque, dimmed only by visibility
  const alpha = state.opacity
  ctx.beginPath()
  ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(${rgb}, ${alpha})`
  ctx.fill()

  // Glow ring for hub nodes
  if (isHub && state.opacity > 0.3) {
    ctx.beginPath()
    ctx.arc(screen.x, screen.y, radius + 1.5, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${theme.accentRgb}, ${0.25 * state.opacity})`
    ctx.lineWidth = 1
    ctx.stroke()
  }

  if (state.focused || state.selected) {
    ctx.beginPath()
    ctx.arc(screen.x, screen.y, radius + 3, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${theme.accentRgb}, ${0.6 * state.opacity})`
    ctx.lineWidth = 1.2
    ctx.stroke()
  }
}

export const drawScene = ({
  ctx,
  width,
  height,
  now,
  nodes,
  edges,
  snapshot,
  adjacency,
  visibility,
  options,
  appearancePulse,
}: DrawSceneArgs) => {
  const { theme, styling, alwaysShowPrimaryLabels, edgeKinds } = options
  const camera = snapshot.camera

  ctx.clearRect(0, 0, width, height)
  if (theme.background !== 'transparent') {
    ctx.fillStyle = theme.background
    ctx.fillRect(0, 0, width, height)
  }

  // Apply crispEdges: disable anti-aliasing for sharper lines
  ctx.imageSmoothingEnabled = !styling.crispEdges

  const visibleNodes = nodes.filter((node) => Number.isFinite(node.x) && Number.isFinite(node.y))

  edges.forEach((edge, edgeIndex) => {
    const source = worldToScreen(edge.source, camera)
    const target = worldToScreen(edge.target, camera)
    const kindStyle = resolveEdgeKindStyle(edge.kind, edgeKinds)

    if ((source.x < 0 && target.x < 0) || (source.x > width && target.x > width)) return
    if ((source.y < 0 && target.y < 0) || (source.y > height && target.y > height)) return

    const dx = edge.source.x - edge.target.x
    const dy = edge.source.y - edge.target.y
    const cullDistance = kindStyle.cullDistance ?? (kindStyle.weak ? options.styling.weakEdgeCullDistance : undefined)
    if (cullDistance && dx * dx + dy * dy > cullDistance ** 2) return

    const opacity = edgeOpacity(edge, snapshot, adjacency, styling.brightness)
    const state = {
      focused: opacity >= 1,
      highlighted: opacity > 0.4,
      weak: kindStyle.weak,
      zoom: camera.k,
      opacity,
    }

    const customHandled = styling.drawEdge?.({
      ctx,
      edge,
      state,
      source,
      target,
      theme,
      kindStyle,
      now,
      edgeIndex,
    })

    if (customHandled === true) return

    ctx.strokeStyle = styling.edgeColor(edge, state, theme, kindStyle)
    ctx.lineWidth = styling.edgeWidth(edge, state, kindStyle)
    defaultDrawEdge({ ctx, edge, state, source, target, theme, kindStyle, now, edgeIndex }, styling.particleSpeed)
  })

  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  for (const node of visibleNodes) {
    if (node.entryT < 1) node.entryT = Math.min(1, (now - node.entryStart) / 400)
    const scale = easeOutCubic(node.entryT)
    const hubScale = node.isPrimary ? 1 : Math.max(0.55, Math.min(0.85, 0.4 + 0.05 * Math.sqrt(node.degree || 1)))
    const radius = styling.nodeRadius(node) * scale * hubScale * camera.k
    if (radius < 0.3) continue

    const screen = worldToScreen(node, camera)
    if (screen.x < -radius * 4 || screen.x > width + radius * 4) continue
    if (screen.y < -radius * 4 || screen.y > height + radius * 4) continue

    const opacity = visibility.get(node.id) ?? 1
    const state = makeNodeState(node, snapshot, adjacency, opacity)

    const customHandled = styling.drawNode?.({ ctx, node, state, radius, screen, theme })
    if (customHandled !== true) {
      defaultDrawNode({ ctx, node, state, radius, screen, theme }, styling.hubDegreeThreshold)
    }
  }

  if (appearancePulse.id) {
    const node = nodes.find((entry) => entry.id === appearancePulse.id)
    if (node) {
      const elapsed = now - appearancePulse.startTime
      if (elapsed < 650) {
        const screen = worldToScreen(node, camera)
        const t = elapsed / 650
        const radius = styling.nodeRadius(node) * camera.k
        const growth = 1 - Math.pow(1 - t, 2)
        ctx.beginPath()
        ctx.arc(screen.x, screen.y, radius + growth * radius * 3.5, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${node.isPrimary ? theme.accentRgb : theme.nodeRgb}, ${(1 - t) * 0.45})`
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }
  }

  // Build set of neighbor IDs for the active node (hovered or selected)
  const activeId = snapshot.hoveredId ?? snapshot.selectedId
  const activeNeighborIds = activeId ? adjacency.get(activeId) ?? new Set<string>() : new Set<string>()

  for (const node of visibleNodes) {
    const radius = styling.nodeRadius(node) * camera.k
    if (radius < 0.3) continue

    const context: LabelVisibilityContext = {
      zoom: camera.k,
      focusedId: snapshot.focusedId,
      hoveredId: snapshot.hoveredId,
      selectedId: snapshot.selectedId,
      highlightedIds: snapshot.highlightedIds,
      alwaysShowPrimaryLabels,
      hubDegreeThreshold: styling.hubDegreeThreshold,
    }

    // Also show labels for neighbors of the active (hovered or selected) node
    const isActiveNeighbor = activeId ? (node.id === activeId || activeNeighborIds.has(node.id)) : false
    if (!isActiveNeighbor && !styling.showLabel(node, context)) continue

    const screen = worldToScreen(node, camera)
    const opacity = visibility.get(node.id) ?? 1
    const fontSize = isActiveNeighbor && node.id !== activeId
      ? Math.max(9, styling.labelFontSize(node, context))
      : styling.labelFontSize(node, context)
    ctx.font = `${fontSize}px ${theme.fontFamily}`
    ctx.fillStyle = `rgba(${theme.labelRgb}, ${Math.max(0.06, Math.min(0.92, opacity))})`

    const label = styling.labelText(node)
    const maxChars = Math.max(8, Math.floor(120 / (0.55 * fontSize)))
    const clipped = label.length > maxChars ? `${label.slice(0, maxChars)}…` : label
    ctx.fillText(clipped, screen.x, screen.y + radius + 3)
  }
}
