import React, { useEffect, useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'
import { defaultStyling } from '../core/defaults'
import type { GraphControllerOptions, NodeOverlayPayload } from '../core/types'

export const arsContextaPalette = {
  background: '#12110f',
  backgroundDeep: '#0b0c0a',
  foreground: '#f4f1ec',
  cream200: '#ebe7df',
  cream300: '#e0dacf',
  cream400: '#d2c9bc',
  muted: '#2d2a27',
  mutedForeground: '#8a8379',
  accent: '#ac7957',
  graphEdgeRgb: '245, 240, 232',
  graphDotRgb: '245, 240, 232',
  graphAccentRgb: '186, 144, 104',
}

export type ArsContextaTuning = {
  backgroundBrightness: number
  glowStrength: number
  fogStrength: number
  vignetteStrength: number
  cardBrightness: number
  cardOpacity: number
  graphContrast: number
  heroOpacity: number
  grainOpacity: number
}

export const defaultArsContextaTuning: ArsContextaTuning = {
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

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export const normalizeArsContextaTuning = (tuning?: Partial<ArsContextaTuning>): ArsContextaTuning => ({
  ...defaultArsContextaTuning,
  ...tuning,
})

export const arsContextaPreset = (tuning?: Partial<ArsContextaTuning>): Partial<GraphControllerOptions> => {
  const t = normalizeArsContextaTuning(tuning)
  const edgeBase = clamp(1 * t.graphContrast, 0.7, 1.8)
  const nodeBase = clamp(1 * t.graphContrast, 0.75, 1.8)

  return {
    alwaysShowPrimaryLabels: true,
    theme: {
      background: arsContextaPalette.backgroundDeep,
      edgeRgb: arsContextaPalette.graphEdgeRgb,
      nodeRgb: arsContextaPalette.graphDotRgb,
      accentRgb: arsContextaPalette.graphAccentRgb,
      labelRgb: arsContextaPalette.graphDotRgb,
      fontFamily: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    },
    edgeKinds: {
      weak: {
        widthMultiplier: 0.5 * edgeBase,
        opacityBoost: 0.9 * edgeBase,
      },
      strong: {
        widthMultiplier: 1 * edgeBase,
        opacityBoost: 1.08 * edgeBase,
      },
      default: {
        widthMultiplier: 1 * edgeBase,
        opacityBoost: 1.02 * edgeBase,
      },
    },
    styling: {
      ...defaultStyling,
      nodeColor: (node, state, theme) => {
        const rgb = node.isPrimary ? theme.accentRgb : theme.nodeRgb
        const alpha = (node.isPrimary ? 0.82 : 0.66) * state.opacity * nodeBase
        return `rgba(${rgb}, ${Math.min(0.98, alpha)})`
      },
    },
  }
}

export const createArsContextaBackdropStyle = (tuning?: Partial<ArsContextaTuning>): CSSProperties => {
  const t = normalizeArsContextaTuning(tuning)
  return {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    background: `
      radial-gradient(circle at 50% 16%, rgba(244,241,236,${0.12 * t.glowStrength}) 0%, rgba(210,201,188,${0.10 * t.glowStrength}) 14%, rgba(172,121,87,${0.10 * t.glowStrength}) 25%, rgba(0,0,0,0) 48%),
      radial-gradient(circle at 50% 40%, rgba(255,255,255,${0.065 * t.fogStrength}) 0%, rgba(255,255,255,${0.018 * t.fogStrength}) 26%, rgba(0,0,0,0) 62%),
      linear-gradient(180deg, ${arsContextaPalette.background} 0%, #0e0f0c 44%, ${arsContextaPalette.backgroundDeep} 100%)
    `,
    filter: `brightness(${t.backgroundBrightness})`,
  }
}

export const createArsContextaGateCardStyle = (tuning?: Partial<ArsContextaTuning>): CSSProperties => {
  const t = normalizeArsContextaTuning(tuning)
  return {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
    border: '1px solid rgba(245,240,232,0.11)',
    background: `linear-gradient(135deg, rgba(245,240,232,${0.075 * t.cardOpacity}) 0%, rgba(0,0,0,0) 55%), rgba(196,191,182,${0.07 * t.cardOpacity})`,
    backdropFilter: `blur(28px) saturate(1.25) brightness(${0.52 * t.cardBrightness})`,
    boxShadow: 'inset 1px 1px rgba(245,240,232,0.14), inset 0 -1px rgba(0,0,0,0.14), 0 6px 32px rgba(0,0,0,0.16)',
  }
}

export const arsContextaGateCardStyle: CSSProperties = createArsContextaGateCardStyle()

export const ArsContextaBackdrop = ({ style, tuning }: { style?: CSSProperties; tuning?: Partial<ArsContextaTuning> }) => {
  const t = normalizeArsContextaTuning(tuning)
  return (
    <div aria-hidden="true" style={{ ...createArsContextaBackdropStyle(t), ...style }}>
      <div
        style={{
          position: 'absolute',
          inset: -80,
          background:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 3px), repeating-linear-gradient(90deg, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 1px, transparent 1px, transparent 4px)',
          opacity: 0.11 * t.grainOpacity,
          mixBlendMode: 'soft-light',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at center, transparent 42%, rgba(0,0,0,${0.18 * t.vignetteStrength}) 76%, rgba(0,0,0,${0.42 * t.vignetteStrength}) 100%)`,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

export const ArsContextaHeroArt = ({
  assetBasePath = '/arscontexta',
  size = 448,
  opacity = 0.92,
  tuning,
  style,
}: {
  assetBasePath?: string
  size?: number
  opacity?: number
  tuning?: Partial<ArsContextaTuning>
  style?: CSSProperties
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const targetRef = useRef(0.5)
  const smoothRef = useRef(0.5)
  const easedRef = useRef(0.5)
  const rafRef = useRef(0)
  const t = useMemo(() => normalizeArsContextaTuning(tuning), [tuning])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 256
    canvas.height = 266
    ctx.imageSmoothingEnabled = false

    const image = new Image()
    image.src = `${assetBasePath}/scholar-atlas-v2.jpg`

    const drawFrame = (index: number) => {
      const row = Math.floor(index / 7)
      ctx.clearRect(0, 0, 256, 266)
      ctx.drawImage(image, (index % 7) * 256, row * 266, 256, 266, 0, 0, 256, 266)
    }

    image.onload = () => {
      let currentIndex = 24
      const start = performance.now()
      drawFrame(currentIndex)

      const animate = (now: number) => {
        smoothRef.current += (targetRef.current - smoothRef.current) * 0.2
        easedRef.current += (smoothRef.current - easedRef.current) * 0.15
        const drift = 0.03 * Math.sin((now - start) / 2000)
        const nextIndex = Math.round(48 * Math.max(0, Math.min(1, easedRef.current + drift)))
        if (nextIndex !== currentIndex) {
          currentIndex = nextIndex
          drawFrame(currentIndex)
        }
        rafRef.current = requestAnimationFrame(animate)
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    const onMouseMove = (event: MouseEvent) => {
      targetRef.current = event.clientX / window.innerWidth
    }
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches[0]) targetRef.current = event.touches[0].clientX / window.innerWidth
    }
    const onLeave = () => {
      targetRef.current = 0.5
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('mouseleave', onLeave, { passive: true })

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('mouseleave', onLeave)
    }
  }, [assetBasePath])

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width: size,
        height: size,
        opacity: opacity * t.heroOpacity,
        filter: `brightness(${1.02 * t.backgroundBrightness})`,
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: size * 0.5,
          height: size * 0.52,
          transform: 'translate(-50%, -50%)',
          filter: 'contrast(1.02) brightness(1.04)',
        }}
      />
      <img
        src={`${assetBasePath}/frame.png`}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

export const ArsContextaCubeStrip = ({
  assetBasePath = '/arscontexta',
  count = 8,
  className,
  style,
}: {
  assetBasePath?: string
  count?: number
  className?: string
  style?: CSSProperties
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    element.replaceChildren()
    const nodes: HTMLImageElement[] = []
    for (let index = 0; index < count; index += 1) {
      const image = document.createElement('img')
      image.src = `${assetBasePath}/cube.png`
      image.alt = ''
      image.width = 18
      image.height = 18
      image.style.display = 'inline-block'
      image.style.filter = 'invert(1)'
      image.style.opacity = '0.18'
      image.style.transform = 'scale(1)'
      element.appendChild(image)
      nodes.push(image)
    }

    const start = performance.now()
    let raf = 0
    const animate = (now: number) => {
      const tt = (now - start) / 1000
      for (let index = 0; index < count; index += 1) {
        const wave = (Math.sin(1.6 * tt - 0.9 * index) + 1) / 2
        const eased = Math.pow(wave * wave * (3 - 2 * wave), 1.8)
        const opacity = 0.15 + 0.35 * eased
        const scale = 1 + 0.1 * eased
        nodes[index].style.opacity = String(opacity)
        nodes[index].style.transform = `scale(${scale})`
      }
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(raf)
  }, [assetBasePath, count])

  return <div ref={containerRef} className={className} style={{ display: 'flex', gap: 4, alignItems: 'center', ...style }} aria-hidden="true" />
}

export const ArsContextaOverlay = ({ node, screen, neighborCount }: NodeOverlayPayload) => {
  const top = screen.y < 220 ? screen.y + 14 : screen.y - 14
  const transform = screen.y < 220 ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'

  return (
    <div
      style={{
        position: 'absolute',
        left: screen.x,
        top,
        transform,
        zIndex: 20,
        width: 260,
        maxHeight: 280,
        overflow: 'hidden',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(6,7,6,0.82)',
        backdropFilter: 'blur(48px) saturate(1.8) brightness(0.75)',
        boxShadow: '0 8px 64px rgba(0,0,0,0.75), inset 0 1px rgba(255,255,255,0.06)',
        color: arsContextaPalette.foreground,
        pointerEvents: 'auto',
        fontFamily: 'IBM Plex Mono, monospace',
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '10px 14px 6px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
          {node.isPrimary ? '◈ ' : ''}
          {node.label ?? node.id}
        </div>
        <div style={{ marginTop: 2, fontSize: 10, color: '#9a9488' }}>
          {neighborCount} connection{neighborCount === 1 ? '' : 's'}
          {node.kind ? ` · ${node.kind}` : ''}
        </div>
      </div>
      {typeof node.data === 'object' && node.data && 'description' in (node.data as Record<string, unknown>) ? (
        <div style={{ padding: '8px 14px', fontSize: 11, lineHeight: 1.55, color: '#9a9488' }}>
          {String((node.data as Record<string, unknown>).description ?? '')}
        </div>
      ) : null}
    </div>
  )
}
