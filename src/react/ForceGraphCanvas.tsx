import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { GraphController } from '../core/graphController'
import type {
  GraphControllerOptions,
  GraphDataset,
  GraphSnapshot,
  NodeOverlayPayload,
  RenderNode,
} from '../core/types'

export type ForceGraphCanvasProps = {
  data: GraphDataset
  className?: string
  style?: React.CSSProperties
  options?: Partial<GraphControllerOptions>
  focusedNodeId?: string | null
  selectedNodeId?: string | null
  highlightedNodeIds?: Iterable<string>
  onNodeClick?: (node: RenderNode) => void
  onNodeDoubleClick?: (node: RenderNode) => void
  onSelectedNodeChange?: (node: RenderNode | null) => void
  onFocusedNodeChange?: (node: RenderNode | null) => void
  onStateChange?: (snapshot: GraphSnapshot) => void
  onReady?: (controller: GraphController) => void
  renderOverlay?: (payload: NodeOverlayPayload) => React.ReactNode
}

export const ForceGraphCanvas = forwardRef<GraphController | null, ForceGraphCanvasProps>(function ForceGraphCanvas(
  {
    data,
    className,
    style,
    options,
    focusedNodeId,
    selectedNodeId,
    highlightedNodeIds,
    onNodeClick,
    onNodeDoubleClick,
    onSelectedNodeChange,
    onFocusedNodeChange,
    onStateChange,
    onReady,
    renderOverlay,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const controllerRef = useRef<GraphController | null>(null)
  const [, setVersion] = useState(0)

  const highlightedKey = useMemo(() => [...(highlightedNodeIds ?? [])].sort().join('|'), [highlightedNodeIds])

  useImperativeHandle(ref, () => controllerRef.current as GraphController, [])

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return
    const controller = new GraphController({
      canvas: canvasRef.current,
      container: containerRef.current,
      data,
      options,
      initialFocusedNodeId: focusedNodeId,
      initialSelectedNodeId: selectedNodeId,
      onNodeClick,
      onNodeDoubleClick,
      onSelectionChange: onSelectedNodeChange,
      onFocusChange: onFocusedNodeChange,
      onStateChange: (snapshot) => {
        onStateChange?.(snapshot)
        setVersion((prev) => prev + 1)
      },
    })
    controllerRef.current = controller
    onReady?.(controller)
    return () => controller.destroy()
  }, [])

  useEffect(() => {
    controllerRef.current?.setData(data)
  }, [data])

  useEffect(() => {
    controllerRef.current?.updateOptions(options)
  }, [options])

  useEffect(() => {
    if (focusedNodeId !== undefined) controllerRef.current?.setFocusedNode(focusedNodeId)
  }, [focusedNodeId])

  useEffect(() => {
    if (selectedNodeId !== undefined) controllerRef.current?.setSelectedNode(selectedNodeId)
  }, [selectedNodeId])

  useEffect(() => {
    controllerRef.current?.setHighlightedNodes(highlightedNodeIds ?? [])
  }, [highlightedKey])

  const overlay = controllerRef.current?.getSelectedOverlay() ?? null

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        cursor: 'grab',
        touchAction: 'none',
        ...style,
      }}
    >
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
      {overlay && renderOverlay ? renderOverlay(overlay) : null}
    </div>
  )
})
