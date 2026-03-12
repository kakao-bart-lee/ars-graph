import type { CameraTransform, ScreenPoint, WorldPoint } from '../core/types'

export const worldToScreen = (point: WorldPoint, camera: CameraTransform): ScreenPoint => ({
  x: point.x * camera.k + camera.x,
  y: point.y * camera.k + camera.y,
})

export const screenToWorld = (point: ScreenPoint, camera: CameraTransform): WorldPoint => ({
  x: (point.x - camera.x) / camera.k,
  y: (point.y - camera.y) / camera.k,
})

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
