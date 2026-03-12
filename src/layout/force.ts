import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
} from 'd3-force'
import { resolveEdgeKindStyle } from '../core/defaults'
import type { EdgeKindPresetMap, GraphLayoutOptions, RenderEdge, RenderNode } from '../core/types'

export const createForceLayout = (
  nodes: RenderNode[],
  edges: RenderEdge[],
  options: GraphLayoutOptions,
  edgeKinds?: EdgeKindPresetMap,
): Simulation<RenderNode, RenderEdge> => {
  const simulation = forceSimulation(nodes)
    .force('center', forceCenter(0, 0).strength(options.centerStrength))
    .force('charge', forceManyBody<RenderNode>().strength(options.chargeStrength).distanceMax(options.chargeDistanceMax))
    .force(
      'link',
      forceLink<RenderNode, RenderEdge>(edges)
        .id((node) => node.id)
        .distance((edge) => options.linkDistance(edge, resolveEdgeKindStyle(edge.kind, edgeKinds)))
        .strength((edge) => options.linkStrength(edge, resolveEdgeKindStyle(edge.kind, edgeKinds))),
    )
    .force('collide', forceCollide<RenderNode>().radius((node) => options.collisionRadius(node)))
    .alphaDecay(options.alphaDecay)
    .alphaMin(options.alphaMin)
    .velocityDecay(options.velocityDecay)

  return simulation
}
