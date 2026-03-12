import type { Simulation } from 'd3-force'
import { defaultOptions, resolveEdgeKindStyle } from './defaults'
import type {
  CameraTransform,
  CenterOnNodeOptions,
  FitViewOptions,
  GraphControllerOptions,
  GraphDataset,
  GraphSnapshot,
  NodeOverlayPayload,
  RenderEdge,
  RenderNode,
} from './types'
import { createForceLayout } from '../layout/force'
import { drawScene, rebuildHitIndex } from '../render/canvasRenderer'
import { clamp, easeOutCubic, screenToWorld, worldToScreen } from '../utils/viewport'

type FocusAnimation = {
  active: boolean
  startX: number
  startY: number
  targetX: number
  targetY: number
  startTime: number
}

type PointerState = {
  startX: number
  startY: number
  startCameraX: number
  startCameraY: number
  dragging: boolean
}

type PinchState = {
  distance: number
}

export type GraphControllerInit = {
  canvas: HTMLCanvasElement
  container: HTMLElement
  data: GraphDataset
  options?: Partial<GraphControllerOptions>
  initialFocusedNodeId?: string | null
  initialSelectedNodeId?: string | null
  onStateChange?: (snapshot: GraphSnapshot) => void
  onNodeClick?: (node: RenderNode) => void
  onNodeDoubleClick?: (node: RenderNode) => void
  onSelectionChange?: (node: RenderNode | null) => void
  onFocusChange?: (node: RenderNode | null) => void
}

const mergeOptions = (input?: Partial<GraphControllerOptions>): GraphControllerOptions => ({
  ...defaultOptions,
  ...input,
  theme: { ...defaultOptions.theme, ...input?.theme },
  layout: { ...defaultOptions.layout, ...input?.layout },
  interaction: { ...defaultOptions.interaction, ...input?.interaction },
  styling: { ...defaultOptions.styling, ...input?.styling },
  edgeKinds: { ...defaultOptions.edgeKinds, ...input?.edgeKinds },
})

export class GraphController {
  private canvas: HTMLCanvasElement
  private container: HTMLElement
  private ctx: CanvasRenderingContext2D
  private options: GraphControllerOptions
  private simulation: Simulation<RenderNode, RenderEdge> | null = null
  private nodes: RenderNode[] = []
  private edges: RenderEdge[] = []
  private nodesById = new Map<string, RenderNode>()
  private adjacency = new Map<string, Set<string>>()
  private visibility = new Map<string, number>()
  private hitIndex = rebuildHitIndex([])
  private onStateChange?: (snapshot: GraphSnapshot) => void
  private onNodeClick?: (node: RenderNode) => void
  private onNodeDoubleClick?: (node: RenderNode) => void
  private onSelectionChange?: (node: RenderNode | null) => void
  private onFocusChange?: (node: RenderNode | null) => void
  private resizeObserver: ResizeObserver | null = null
  private rafId = 0
  private lastFrameTime = 0
  private pointer: PointerState | null = null
  private pinch: PinchState | null = null
  private dragNode: RenderNode | null = null
  private focusAnimation: FocusAnimation = { active: false, startX: 0, startY: 0, targetX: 0, targetY: 0, startTime: 0 }
  private pulse = { id: null as string | null, startTime: 0 }
  private lastClick = { id: '', time: 0 }
  private snapshot: GraphSnapshot = {
    selectedId: null,
    hoveredId: null,
    focusedId: null,
    highlightedIds: new Set<string>(),
    camera: { x: 0, y: 0, k: 1 },
  }

  constructor(init: GraphControllerInit) {
    this.canvas = init.canvas
    this.container = init.container
    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('2d context is required')
    this.ctx = ctx
    this.options = mergeOptions(init.options)
    this.onStateChange = init.onStateChange
    this.onNodeClick = init.onNodeClick
    this.onNodeDoubleClick = init.onNodeDoubleClick
    this.onSelectionChange = init.onSelectionChange
    this.onFocusChange = init.onFocusChange

    this.setData(init.data)
    this.bind()
    this.resize()
    this.start()

    if (init.initialSelectedNodeId !== undefined) this.setSelectedNode(init.initialSelectedNodeId)
    if (init.initialFocusedNodeId !== undefined) this.setFocusedNode(init.initialFocusedNodeId)
  }

  getSnapshot = () => this.snapshot

  getSelectedOverlay = (): NodeOverlayPayload | null => {
    if (!this.snapshot.selectedId) return null
    const node = this.nodesById.get(this.snapshot.selectedId)
    if (!node) return null
    const screen = worldToScreen(node, this.snapshot.camera)
    return {
      node,
      screen,
      neighborCount: this.adjacency.get(node.id)?.size ?? 0,
    }
  }

  updateOptions = (options?: Partial<GraphControllerOptions>) => {
    this.options = mergeOptions(options)
    if (this.nodes.length > 0) {
      this.simulation?.stop()
      this.simulation = createForceLayout(this.nodes, this.edges, this.options.layout, this.options.edgeKinds)
    }
    this.notify()
  }

  setData = (data: GraphDataset) => {
    const previous = new Map(this.nodes.map((node) => [node.id, node]))
    const degree = new Map<string, number>()
    for (const edge of data.edges) {
      degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1)
      degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1)
    }

    this.nodes = data.nodes.map((node, index) => {
      const old = previous.get(node.id)
      return {
        ...node,
        index,
        degree: degree.get(node.id) ?? 0,
        x: old?.x ?? (Math.random() - 0.5) * 80,
        y: old?.y ?? (Math.random() - 0.5) * 80,
        vx: old?.vx ?? 0,
        vy: old?.vy ?? 0,
        fx: old?.fx ?? null,
        fy: old?.fy ?? null,
        entryStart: performance.now(),
        entryT: old?.entryT ?? 0,
      }
    })

    this.nodesById = new Map(this.nodes.map((node) => [node.id, node]))
    this.edges = data.edges
      .map((edge, index) => {
        const source = this.nodesById.get(edge.source)
        const target = this.nodesById.get(edge.target)
        if (!source || !target) return null
        const kindStyle = resolveEdgeKindStyle(edge.kind, this.options.edgeKinds)
        return {
          ...edge,
          id: edge.id ?? `${edge.source}->${edge.target}:${edge.kind ?? index}`,
          source,
          target,
          kind: edge.kind ?? 'default',
          isWeak: kindStyle.weak,
        }
      })
      .filter((edge): edge is RenderEdge => edge !== null)

    this.adjacency = new Map()
    for (const edge of this.edges) {
      this.addNeighbor(edge.source.id, edge.target.id)
      this.addNeighbor(edge.target.id, edge.source.id)
    }

    for (const node of this.nodes) this.visibility.set(node.id, 1)

    this.simulation?.stop()
    this.simulation = createForceLayout(this.nodes, this.edges, this.options.layout, this.options.edgeKinds)
  }

  setFocusedNode = (id: string | null, centerOptions: CenterOnNodeOptions = { animate: true }) => {
    this.snapshot.focusedId = id
    this.onFocusChange?.(id ? this.nodesById.get(id) ?? null : null)
    this.notify()
    if (!id) return
    this.centerOnNode(id, centerOptions)
  }

  setSelectedNode = (id: string | null) => {
    this.snapshot.selectedId = id
    this.onSelectionChange?.(id ? this.nodesById.get(id) ?? null : null)
    this.notify()
  }

  setHighlightedNodes = (ids: Iterable<string>) => {
    this.snapshot.highlightedIds = new Set(ids)
    const only = this.snapshot.highlightedIds.size === 1 ? [...this.snapshot.highlightedIds][0] : null
    if (only && only !== this.pulse.id) this.pulse = { id: only, startTime: performance.now() }
    this.notify()
  }

  setCamera = (camera: Partial<CameraTransform>) => {
    this.snapshot.camera = { ...this.snapshot.camera, ...camera }
    this.notify()
  }

  fitToView = (options: FitViewOptions = {}) => {
    const ids = options.includeIds ? new Set(options.includeIds) : null
    const nodes = ids ? this.nodes.filter((node) => ids.has(node.id)) : this.nodes
    const valid = nodes.filter((node) => Number.isFinite(node.x) && Number.isFinite(node.y))
    if (valid.length === 0) return

    const rect = this.container.getBoundingClientRect()
    const padding = options.padding ?? 60
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    for (const node of valid) {
      minX = Math.min(minX, node.x)
      maxX = Math.max(maxX, node.x)
      minY = Math.min(minY, node.y)
      maxY = Math.max(maxY, node.y)
    }

    const width = Math.max(1, maxX - minX)
    const height = Math.max(1, maxY - minY)
    const fitZoom = Math.min(
      (rect.width - padding * 2) / width,
      (rect.height - padding * 2) / height,
    )
    const nextZoom = clamp(
      fitZoom,
      options.minZoom ?? this.options.interaction.minZoom,
      options.maxZoom ?? this.options.interaction.maxZoom,
    )

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    this.snapshot.camera.k = nextZoom
    this.snapshot.camera.x = rect.width / 2 - centerX * nextZoom
    this.snapshot.camera.y = rect.height / 2 - centerY * nextZoom
    this.notify()
  }

  centerOnNode = (id: string, options: CenterOnNodeOptions = {}) => {
    const node = this.nodesById.get(id)
    if (!node) return
    const rect = this.container.getBoundingClientRect()
    const zoom = options.zoom ?? this.snapshot.camera.k

    if (options.animate === false) {
      this.snapshot.camera.k = zoom
      this.snapshot.camera.x = rect.width / 2 - node.x * zoom
      this.snapshot.camera.y = rect.height / 2 - node.y * zoom
      this.notify()
      return
    }

    this.snapshot.camera.k = zoom
    this.focusAnimation = {
      active: true,
      startX: this.snapshot.camera.x,
      startY: this.snapshot.camera.y,
      targetX: rect.width / 2 - node.x * zoom,
      targetY: rect.height / 2 - node.y * zoom,
      startTime: performance.now(),
    }
  }

  destroy = () => {
    cancelAnimationFrame(this.rafId)
    this.resizeObserver?.disconnect()
    this.container.removeEventListener('pointerdown', this.onPointerDown)
    this.container.removeEventListener('pointermove', this.onPointerMove)
    this.container.removeEventListener('pointerup', this.onPointerUp)
    this.container.removeEventListener('pointerleave', this.onPointerLeave)
    this.container.removeEventListener('wheel', this.onWheel)
    this.container.removeEventListener('touchstart', this.onTouchStart)
    this.container.removeEventListener('touchmove', this.onTouchMove)
    this.container.removeEventListener('touchend', this.onTouchEnd)
    this.container.removeEventListener('touchcancel', this.onTouchEnd)
    this.simulation?.stop()
  }

  private start = () => {
    const frame = (now: number) => {
      this.tick(now)
      this.rafId = requestAnimationFrame(frame)
    }
    this.rafId = requestAnimationFrame(frame)
  }

  private tick = (now: number) => {
    const dt = this.lastFrameTime > 0 ? Math.min(50, now - this.lastFrameTime) : 16
    this.lastFrameTime = now

    if (this.focusAnimation.active) {
      const progress = Math.min(1, (now - this.focusAnimation.startTime) / 400)
      const eased = easeOutCubic(progress)
      this.snapshot.camera.x = this.focusAnimation.startX + (this.focusAnimation.targetX - this.focusAnimation.startX) * eased
      this.snapshot.camera.y = this.focusAnimation.startY + (this.focusAnimation.targetY - this.focusAnimation.startY) * eased
      if (progress >= 1) this.focusAnimation.active = false
    }

    const [FADED, NORMAL, FOCUSED] = this.options.styling.brightness

    for (const node of this.nodes) {
      let target = NORMAL
      // The "active" node is hovered if present, otherwise selected (keeps focus on selection)
      const activeId = this.snapshot.hoveredId ?? this.snapshot.selectedId
      if (activeId) {
        const neighbors = this.adjacency.get(activeId)
        target = node.id === activeId || neighbors?.has(node.id) ? FOCUSED : FADED
      } else if (this.snapshot.highlightedIds.size > 0) {
        target = this.snapshot.highlightedIds.has(node.id) ? FOCUSED : FADED
      }
      const current = this.visibility.get(node.id) ?? NORMAL
      const next = current + (target - current) * Math.min(1, 0.0018 * dt)
      this.visibility.set(node.id, next)
    }

    this.hitIndex = rebuildHitIndex(this.nodes)
    drawScene({
      ctx: this.ctx,
      width: this.container.clientWidth,
      height: this.container.clientHeight,
      now,
      nodes: this.nodes,
      edges: this.edges,
      snapshot: this.snapshot,
      adjacency: this.adjacency,
      visibility: this.visibility,
      options: this.options,
      appearancePulse: this.pulse,
    })
  }

  private bind = () => {
    this.container.addEventListener('pointerdown', this.onPointerDown)
    this.container.addEventListener('pointermove', this.onPointerMove)
    this.container.addEventListener('pointerup', this.onPointerUp)
    this.container.addEventListener('pointerleave', this.onPointerLeave)
    this.container.addEventListener('wheel', this.onWheel, { passive: false })
    this.container.addEventListener('touchstart', this.onTouchStart, { passive: false })
    this.container.addEventListener('touchmove', this.onTouchMove, { passive: false })
    this.container.addEventListener('touchend', this.onTouchEnd)
    this.container.addEventListener('touchcancel', this.onTouchEnd)
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(this.container)
  }

  private resize = () => {
    const rect = this.container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = rect.width * dpr
    this.canvas.height = rect.height * dpr
    this.canvas.style.width = `${rect.width}px`
    this.canvas.style.height = `${rect.height}px`
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.scale(dpr, dpr)
    if (this.snapshot.camera.x === 0 && this.snapshot.camera.y === 0) {
      this.snapshot.camera.x = rect.width / 2
      this.snapshot.camera.y = rect.height / 2
      this.notify()
    }
  }

  private addNeighbor = (from: string, to: string) => {
    const current = this.adjacency.get(from)
    if (current) {
      current.add(to)
      return
    }
    this.adjacency.set(from, new Set([to]))
  }

  private hitTest = (clientX: number, clientY: number) => {
    const rect = this.container.getBoundingClientRect()
    const world = screenToWorld({ x: clientX - rect.left, y: clientY - rect.top }, this.snapshot.camera)
    return this.hitIndex.find(world.x, world.y, 20 / this.snapshot.camera.k) ?? null
  }

  private applyZoomAtPoint = (x: number, y: number, nextZoom: number) => {
    const clamped = clamp(nextZoom, this.options.interaction.minZoom, this.options.interaction.maxZoom)
    const scale = clamped / this.snapshot.camera.k
    this.snapshot.camera.x = x - (x - this.snapshot.camera.x) * scale
    this.snapshot.camera.y = y - (y - this.snapshot.camera.y) * scale
    this.snapshot.camera.k = clamped
    this.notify()
  }

  private notify = () => this.onStateChange?.(this.snapshot)

  private onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    this.pointer = {
      startX: event.clientX,
      startY: event.clientY,
      startCameraX: this.snapshot.camera.x,
      startCameraY: this.snapshot.camera.y,
      dragging: false,
    }

    const node = this.hitTest(event.clientX, event.clientY)
    if (node && this.options.interaction.draggableNodes) {
      this.dragNode = node
      const rect = this.container.getBoundingClientRect()
      const world = screenToWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top }, this.snapshot.camera)
      node.fx = world.x
      node.fy = world.y
      this.simulation?.alphaTarget(0.1).restart()
      this.container.setPointerCapture(event.pointerId)
    }
  }

  private onPointerMove = (event: PointerEvent) => {
    if (!this.pointer) {
      const hovered = this.hitTest(event.clientX, event.clientY)
      const next = hovered?.id ?? null
      if (next !== this.snapshot.hoveredId) {
        this.snapshot.hoveredId = next
        this.notify()
      }
      return
    }

    const dx = event.clientX - this.pointer.startX
    const dy = event.clientY - this.pointer.startY
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance > this.options.interaction.dragThreshold) this.pointer.dragging = true

    if (this.dragNode) {
      const rect = this.container.getBoundingClientRect()
      const world = screenToWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top }, this.snapshot.camera)
      this.dragNode.fx = world.x
      this.dragNode.fy = world.y
      return
    }

    if (this.options.interaction.pannable && this.pointer.dragging) {
      this.snapshot.camera.x = this.pointer.startCameraX + dx
      this.snapshot.camera.y = this.pointer.startCameraY + dy
      this.notify()
    }
  }

  private onPointerUp = (event: PointerEvent) => {
    const wasDragging = this.pointer?.dragging ?? false
    if (this.dragNode) {
      this.dragNode.fx = null
      this.dragNode.fy = null
      this.dragNode = null
      this.simulation?.alphaTarget(0)
      this.container.releasePointerCapture(event.pointerId)
    }

    const node = this.hitTest(event.clientX, event.clientY)
    this.pointer = null
    this.snapshot.hoveredId = node?.id ?? null
    this.notify()

    if (wasDragging) return

    if (!node) {
      this.setSelectedNode(null)
      return
    }

    const now = performance.now()
    this.setSelectedNode(node.id)

    if (this.lastClick.id === node.id && now - this.lastClick.time <= this.options.interaction.doubleClickMs) {
      this.onNodeDoubleClick?.(node)
      this.lastClick = { id: '', time: 0 }
      return
    }

    this.onNodeClick?.(node)
    this.lastClick = { id: node.id, time: now }
  }

  private onPointerLeave = () => {
    if (!this.pointer) {
      this.snapshot.hoveredId = null
      this.notify()
    }
  }

  private onWheel = (event: WheelEvent) => {
    if (!this.options.interaction.zoomable) return
    event.preventDefault()
    const rect = this.container.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const factor = event.deltaY > 0 ? 1 - this.options.interaction.zoomStep : 1 + this.options.interaction.zoomStep
    this.applyZoomAtPoint(x, y, this.snapshot.camera.k * factor)
  }

  private onTouchStart = (event: TouchEvent) => {
    if (!this.options.interaction.touchPinchZoom) return
    if (event.touches.length !== 2) return
    event.preventDefault()
    this.pointer = null
    this.dragNode = null
    this.pinch = {
      distance: this.getTouchDistance(event),
    }
  }

  private onTouchMove = (event: TouchEvent) => {
    if (!this.options.interaction.touchPinchZoom || !this.pinch || event.touches.length !== 2) return
    event.preventDefault()
    const nextDistance = this.getTouchDistance(event)
    if (nextDistance <= 0 || this.pinch.distance <= 0) return
    const rect = this.container.getBoundingClientRect()
    const center = this.getTouchCenter(event)
    const x = center.x - rect.left
    const y = center.y - rect.top
    const zoomRatio = nextDistance / this.pinch.distance
    this.applyZoomAtPoint(x, y, this.snapshot.camera.k * zoomRatio)
    this.pinch.distance = nextDistance
  }

  private onTouchEnd = () => {
    this.pinch = null
  }

  private getTouchDistance = (event: TouchEvent) => {
    const [a, b] = [event.touches[0], event.touches[1]]
    const dx = a.clientX - b.clientX
    const dy = a.clientY - b.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  private getTouchCenter = (event: TouchEvent) => {
    const [a, b] = [event.touches[0], event.touches[1]]
    return {
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2,
    }
  }
}
