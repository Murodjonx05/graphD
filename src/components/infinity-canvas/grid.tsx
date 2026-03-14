import type { GridSettings, Point } from "./types"

export function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <path d="m5.64 5.64 2.12 2.12" />
      <path d="m16.24 16.24 2.12 2.12" />
      <path d="m5.64 18.36 2.12-2.12" />
      <path d="m16.24 7.76 2.12-2.12" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  const parsed = Number.parseInt(normalized, 16)

  if (normalized.length !== 6 || Number.isNaN(parsed)) {
    return { r: 148, g: 163, b: 184 }
  }

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  }
}

export function toRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function drawSquareGrid(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  grid: GridSettings,
  offset: Point,
  zoom: number
) {
  const worldMinX = (-width / 2 - offset.x) / zoom
  const worldMaxX = (width / 2 - offset.x) / zoom
  const worldMinY = (-height / 2 - offset.y) / zoom
  const worldMaxY = (height / 2 - offset.y) / zoom
  const minorStep = grid.distance
  const majorStep = grid.distance * grid.steps
  const firstMinorX = Math.floor(worldMinX / minorStep) * minorStep
  const firstMinorY = Math.floor(worldMinY / minorStep) * minorStep
  const firstMajorX = Math.floor(worldMinX / majorStep) * majorStep
  const firstMajorY = Math.floor(worldMinY / majorStep) * majorStep

  context.strokeStyle = toRgba(grid.color, grid.opacity * 0.45)
  context.lineWidth = grid.thickness
  context.beginPath()

  for (let worldX = firstMinorX; worldX <= worldMaxX + minorStep; worldX += minorStep) {
    const screenX = width / 2 + offset.x + worldX * zoom
    context.moveTo(screenX, 0)
    context.lineTo(screenX, height)
  }

  for (let worldY = firstMinorY; worldY <= worldMaxY + minorStep; worldY += minorStep) {
    const screenY = height / 2 + offset.y + worldY * zoom
    context.moveTo(0, screenY)
    context.lineTo(width, screenY)
  }

  context.stroke()

  context.strokeStyle = toRgba(grid.color, Math.min(grid.opacity + 0.18, 1))
  context.lineWidth = grid.thickness + 0.25
  context.beginPath()

  for (let worldX = firstMajorX; worldX <= worldMaxX + majorStep; worldX += majorStep) {
    const screenX = width / 2 + offset.x + worldX * zoom
    context.moveTo(screenX, 0)
    context.lineTo(screenX, height)
  }

  for (let worldY = firstMajorY; worldY <= worldMaxY + majorStep; worldY += majorStep) {
    const screenY = height / 2 + offset.y + worldY * zoom
    context.moveTo(0, screenY)
    context.lineTo(width, screenY)
  }

  context.stroke()
}

export function drawRoundedGrid(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  grid: GridSettings,
  offset: Point,
  zoom: number
) {
  const centerX = width / 2 + offset.x
  const centerY = height / 2 + offset.y
  const radiusStep = Math.max(10, grid.distance * zoom)
  const spokeCount = 16
  const maxRadius =
    Math.max(
      Math.hypot(centerX, centerY),
      Math.hypot(width - centerX, centerY),
      Math.hypot(centerX, height - centerY),
      Math.hypot(width - centerX, height - centerY)
    ) + radiusStep * grid.steps

  for (let radius = radiusStep; radius <= maxRadius; radius += radiusStep) {
    const isMajor = Math.round(radius / radiusStep) % grid.steps === 0
    context.beginPath()
    context.strokeStyle = isMajor
      ? toRgba(grid.color, Math.min(grid.opacity + 0.18, 1))
      : toRgba(grid.color, grid.opacity * 0.42)
    context.lineWidth = isMajor ? grid.thickness + 0.2 : grid.thickness
    context.arc(centerX, centerY, radius, 0, Math.PI * 2)
    context.stroke()
  }

  context.beginPath()
  context.strokeStyle = toRgba(grid.color, grid.opacity * 0.38)
  context.lineWidth = grid.thickness

  for (let index = 0; index < spokeCount; index += 1) {
    const angle = (Math.PI * 2 * index) / spokeCount
    const x = centerX + Math.cos(angle) * maxRadius
    const y = centerY + Math.sin(angle) * maxRadius
    context.moveTo(centerX, centerY)
    context.lineTo(x, y)
  }

  context.stroke()

  context.beginPath()
  context.fillStyle = toRgba(grid.color, Math.min(grid.opacity + 0.3, 1))
  context.arc(centerX, centerY, Math.max(2, grid.thickness + 1.5), 0, Math.PI * 2)
  context.fill()
}

function drawWebRing(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  spokeCount: number,
  wobble: number
) {
  context.beginPath()

  for (let index = 0; index <= spokeCount; index += 1) {
    const angle = (Math.PI * 2 * index) / spokeCount
    const warp = 1 + Math.sin(angle * 3 + radius * 0.01) * wobble
    const x = centerX + Math.cos(angle) * radius * warp
    const y = centerY + Math.sin(angle) * radius * warp

    if (index === 0) {
      context.moveTo(x, y)
    } else {
      context.lineTo(x, y)
    }
  }
}

export function drawWebGrid(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  grid: GridSettings,
  offset: Point,
  zoom: number
) {
  const centerX = width / 2 + offset.x
  const centerY = height / 2 + offset.y
  const ringStep = Math.max(10, grid.distance * zoom)
  const spokeCount = Math.max(12, grid.steps * 3)
  const maxRadius =
    Math.max(
      Math.hypot(centerX, centerY),
      Math.hypot(width - centerX, centerY),
      Math.hypot(centerX, height - centerY),
      Math.hypot(width - centerX, height - centerY)
    ) + ringStep * grid.steps

  for (let radius = ringStep; radius <= maxRadius; radius += ringStep) {
    drawWebRing(context, centerX, centerY, radius, spokeCount, 0.08)
    context.strokeStyle =
      Math.round(radius / ringStep) % grid.steps === 0
        ? toRgba(grid.color, Math.min(grid.opacity + 0.18, 1))
        : toRgba(grid.color, grid.opacity * 0.42)
    context.lineWidth = grid.thickness
    context.stroke()
  }

  context.beginPath()
  context.strokeStyle = toRgba(grid.color, grid.opacity * 0.5)

  for (let index = 0; index < spokeCount; index += 1) {
    const angle = (Math.PI * 2 * index) / spokeCount
    const x = centerX + Math.cos(angle) * maxRadius
    const y = centerY + Math.sin(angle) * maxRadius
    context.moveTo(centerX, centerY)
    context.lineTo(x, y)
  }

  context.stroke()
}
