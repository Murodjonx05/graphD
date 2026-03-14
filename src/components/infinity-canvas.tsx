import { useCallback, useEffect, useRef, useState } from "react"

type Point = {
  x: number
  y: number
}

type GridSettings = {
  type: "square" | "rounded" | "web"
  color: string
  distance: number
  steps: number
  opacity: number
  thickness: number
}

type CardType =
  | "square-body"
  | "square-title-body"
  | "square-table"
  | "square-list-column"
  | "circle-body"
  | "circle-diagram"

type CanvasNode = {
  id: string
  type: CardType
  x: number
  y: number
  title: string
  body: string
  tableColumns: string[]
  tableRows: string[][]
  diagramNodes: string[]
  backgroundColor: string
  opacity: number
  textColor: string
  textSize: number
  textWeight: number
  width: number
  height: number
  autoSize: boolean
}

type NodeDragState = {
  ids: string[]
  pointerId: number
  startClientX: number
  startClientY: number
  startPositions: Record<string, Point>
}

type MenuState = {
  screenX: number
  screenY: number
  worldX: number
  worldY: number
}

type NodeResizeState = {
  id: string
  pointerId: number
  startClientX: number
  startClientY: number
  startWidth: number
  startHeight: number
  minWidth: number
  minHeight: number
}

type SelectionTool = "square" | "circle" | "draw"

type SelectionState = {
  pointerId: number
  tool: SelectionTool
  start: Point
  current: Point
  points: Point[]
}

type Size = {
  width: number
  height: number
}

type PendingNodeTransform =
  | {
      mode: "resize"
      id: string
      width: number
      height: number
    }
  | {
      mode: "drag"
      positions: Record<string, Point>
    }

type EditingField =
  | { kind: "title" | "body"; nodeId: string }
  | { kind: "table-column"; nodeId: string; columnIndex: number }
  | { kind: "table-cell"; nodeId: string; rowIndex: number; columnIndex: number }
  | { kind: "diagram-center"; nodeId: string }
  | { kind: "diagram-node"; nodeId: string; nodeIndex: number }

const DEFAULT_GRID: GridSettings = {
  type: "square",
  color: "#94a3b8",
  distance: 40,
  steps: 5,
  opacity: 0.32,
  thickness: 1,
}

const CARD_OPTIONS: Array<{ type: CardType; label: string }> = [
  { type: "square-body", label: "square(body)" },
  { type: "square-title-body", label: "square(title+body)" },
  { type: "square-table", label: "table" },
  { type: "square-list-column", label: "list_column" },
  { type: "circle-body", label: "circle(body)" },
  { type: "circle-diagram", label: "circle_diagram" },
]

function getThemeNodeDefaults() {
  const styles = getComputedStyle(document.documentElement)

  return {
    backgroundColor: styles.getPropertyValue("--card").trim() || "oklch(1 0 0)",
    textColor:
      styles.getPropertyValue("--card-foreground").trim() || "oklch(0.145 0 0)",
    opacity: 0.95,
  }
}

function createDefaultNode(type: CardType, x: number, y: number): CanvasNode {
  const themeDefaults = getThemeNodeDefaults()
  const base = {
    id: `${type}-${crypto.randomUUID()}`,
    type,
    x,
    y,
    title: "Title",
    body: "Body content",
    tableColumns: ["name", "body"],
    tableRows: [
      ["row 01", "item body"],
      ["row 02", "item body"],
      ["row 03", "item body"],
    ],
    diagramNodes: ["node one", "node two", "node three", "node four"],
    backgroundColor: themeDefaults.backgroundColor,
    opacity: themeDefaults.opacity,
    textColor: themeDefaults.textColor,
    textSize: 14,
    textWeight: 500,
  }

  switch (type) {
    case "square-body":
      return { ...base, width: 176, height: 96, autoSize: true }
    case "square-title-body":
      return { ...base, width: 192, height: 116, autoSize: true }
    case "square-table":
      return { ...base, width: 208, height: 158, autoSize: true }
    case "square-list-column":
      return {
        ...base,
        width: 180,
        height: 188,
        autoSize: true,
        tableColumns: ["items"],
        tableRows: [["item 01"], ["item 02"], ["item 03"]],
      }
    case "circle-body":
      return { ...base, width: 144, height: 144, autoSize: true }
    case "circle-diagram":
      return { ...base, width: 256, height: 256, autoSize: true }
  }
}

function SettingsIcon() {
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

function clamp(value: number, min: number, max: number) {
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

function toRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function drawSquareGrid(
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

function drawRoundedGrid(
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

function drawWebGrid(
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

function InfiniteCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const nodesRef = useRef<CanvasNode[]>([])
  const dragOriginRef = useRef<Point | null>(null)
  const nodeDragRef = useRef<NodeDragState | null>(null)
  const nodeResizeRef = useRef<NodeResizeState | null>(null)
  const selectionRef = useRef<SelectionState | null>(null)
  const contentObserverRef = useRef<ResizeObserver | null>(null)
  const contentElementsRef = useRef(new Map<string, HTMLElement>())
  const nodeTransformFrameRef = useRef<number | null>(null)
  const pendingNodeTransformRef = useRef<PendingNodeTransform | null>(null)
  const [grid, setGrid] = useState<GridSettings>(DEFAULT_GRID)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [themeVersion, setThemeVersion] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [nodes, setNodes] = useState<CanvasNode[]>([])
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [selectionTool, setSelectionTool] = useState<SelectionTool>("square")
  const [selectionState, setSelectionState] = useState<SelectionState | null>(null)
  const [clipboardNodes, setClipboardNodes] = useState<CanvasNode[]>([])
  const [editingField, setEditingField] = useState<EditingField | null>(null)
  const [editingValue, setEditingValue] = useState("")
  const [contentMinSizes, setContentMinSizes] = useState<Record<string, Size>>({})

  const selectedNodeId = selectedNodeIds[0] ?? null
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  const stopCanvasPan = (event: React.PointerEvent<HTMLElement>) => {
    event.stopPropagation()
  }

  const updateNode = (nodeId: string, updater: (node: CanvasNode) => CanvasNode) => {
    setNodes((current) => current.map((node) => (node.id === nodeId ? updater(node) : node)))
  }

  useEffect(() => {
    const updateViewport = () => {
      const container = containerRef.current

      if (!container) {
        return
      }

      setViewport({
        width: container.clientWidth,
        height: container.clientHeight,
      })
    }

    updateViewport()

    const resizeObserver = new ResizeObserver(updateViewport)
    const current = containerRef.current

    if (current) {
      resizeObserver.observe(current)
    }

    window.addEventListener("resize", updateViewport)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", updateViewport)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (nodeTransformFrameRef.current !== null) {
        cancelAnimationFrame(nodeTransformFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      setContentMinSizes((current) => {
        let changed = false
        const next = { ...current }

        for (const entry of entries) {
          const element = entry.target as HTMLElement
          const nodeId = element.dataset.nodeContentId

          if (!nodeId) {
            continue
          }

          if (nodeResizeRef.current?.id === nodeId) {
            continue
          }

          const node = nodesRef.current.find((currentNode) => currentNode.id === nodeId)
          const previous = current[nodeId]
          const contentWidth = Math.ceil(Math.max(80, element.scrollWidth))
          const contentHeight = Math.ceil(Math.max(80, element.scrollHeight))

          const width = node?.autoSize
            ? contentWidth
            : Math.max(80, previous?.width ?? contentWidth)
          const height = Math.max(80, previous?.height ?? 80, contentHeight)

          if (!previous || previous.width !== width || previous.height !== height) {
            next[nodeId] = { width, height }
            changed = true
          }
        }

        return changed ? next : current
      })
    })

    contentObserverRef.current = observer
    contentElementsRef.current.forEach((element) => observer.observe(element))

    return () => {
      observer.disconnect()
      contentObserverRef.current = null
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => {
      setThemeVersion((current) => current + 1)
    })

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    })

    const handleThemeChange = () => {
      setThemeVersion((current) => current + 1)
    }

    window.addEventListener("themechange", handleThemeChange)

    return () => {
      observer.disconnect()
      window.removeEventListener("themechange", handleThemeChange)
    }
  }, [])

  const getNodeContentMinSize = useCallback((node: CanvasNode) => {
    const measured = contentMinSizes[node.id]

    return {
      width: Math.max(80, measured ? measured.width : 80),
      height: Math.max(80, measured ? measured.height : 80),
    }
  }, [contentMinSizes])

  const getEffectiveNodeSize = useCallback((node: CanvasNode) => {
    const minSize = getNodeContentMinSize(node)

    return {
      width: Math.max(node.width, minSize.width),
      height: Math.max(node.height, minSize.height),
    }
  }, [getNodeContentMinSize])

  const nodesOverlap = (
    first: { x: number; y: number; width: number; height: number },
    second: { x: number; y: number; width: number; height: number },
    gap = 24
  ) =>
    Math.abs(first.x - second.x) < (first.width + second.width) / 2 + gap &&
    Math.abs(first.y - second.y) < (first.height + second.height) / 2 + gap

  const findOpenPositionForNode = useCallback((
    node: CanvasNode,
    existingNodes: CanvasNode[],
    preferred: Point
  ) => {
    const size = getEffectiveNodeSize(node)
    const step = Math.max(grid.distance * 1.5, size.width + 32)
    const maxAttempts = 64

    const collidesAt = (candidateX: number, candidateY: number) =>
      existingNodes.some((existingNode) => {
        const existingSize = getEffectiveNodeSize(existingNode)

        return nodesOverlap(
          { x: candidateX, y: candidateY, width: size.width, height: size.height },
          {
            x: existingNode.x,
            y: existingNode.y,
            width: existingSize.width,
            height: existingSize.height,
          }
        )
      })

    if (!collidesAt(preferred.x, preferred.y)) {
      return preferred
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const rightCandidate = { x: preferred.x + step * attempt, y: preferred.y }
      const leftCandidate = { x: preferred.x - step * attempt, y: preferred.y }

      if (!collidesAt(rightCandidate.x, rightCandidate.y)) {
        return rightCandidate
      }

      if (!collidesAt(leftCandidate.x, leftCandidate.y)) {
        return leftCandidate
      }
    }

    return { x: preferred.x + step * (maxAttempts + 1), y: preferred.y }
  }, [getEffectiveNodeSize, grid.distance])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCopy = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c"
      const isPaste = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v"

      if (isCopy && selectedNodeIds.length > 0) {
        event.preventDefault()
        setClipboardNodes(
          nodes
            .filter((node) => selectedNodeIds.includes(node.id))
            .map((node) => ({ ...node }))
        )
      }

      if (isPaste && clipboardNodes.length > 0) {
        event.preventDefault()
        setNodes((current) => {
          const placedNodes = [...current]
          const duplicates = clipboardNodes.map((node, index) => {
            const duplicate = {
              ...node,
              id: `${node.type}-${crypto.randomUUID()}`,
            }
            const preferred = {
              x: node.x + 48 + index * 12,
              y: node.y,
            }
            const position = findOpenPositionForNode(duplicate, placedNodes, preferred)
            const placedNode = {
              ...duplicate,
              x: position.x,
              y: position.y,
            }

            placedNodes.push(placedNode)
            return placedNode
          })

          setSelectedNodeIds(duplicates.map((node) => node.id))
          return placedNodes
        })
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [clipboardNodes, findOpenPositionForNode, nodes, selectedNodeIds])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || viewport.width === 0 || viewport.height === 0) {
      return
    }

    const context = canvas.getContext("2d")

    if (!context) {
      return
    }

    const devicePixelRatio = window.devicePixelRatio || 1
    canvas.width = Math.floor(viewport.width * devicePixelRatio)
    canvas.height = Math.floor(viewport.height * devicePixelRatio)
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`

    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    context.clearRect(0, 0, viewport.width, viewport.height)

    const styles = getComputedStyle(document.documentElement)
    const background = styles.getPropertyValue("--background").trim() || "oklch(1 0 0)"

    context.fillStyle = background
    context.fillRect(0, 0, viewport.width, viewport.height)

    if (grid.type === "square") {
      drawSquareGrid(context, viewport.width, viewport.height, grid, offset, zoom)
    } else if (grid.type === "rounded") {
      drawRoundedGrid(context, viewport.width, viewport.height, grid, offset, zoom)
    } else {
      drawWebGrid(context, viewport.width, viewport.height, grid, offset, zoom)
    }
  }, [grid, offset, themeVersion, viewport, zoom])

  const getNodeScale = () => clamp(zoom, 0.35, 2.5)

  const getNodeScreenBounds = (node: CanvasNode) => {
    const scale = getNodeScale()
    const centerX = viewport.width / 2 + offset.x + node.x * zoom
    const centerY = viewport.height / 2 + offset.y + node.y * zoom
    const effectiveSize = getEffectiveNodeSize(node)
    const width = effectiveSize.width * scale
    const height = effectiveSize.height * scale

    return {
      centerX,
      centerY,
      width,
      height,
      left: centerX - width / 2,
      right: centerX + width / 2,
      top: centerY - height / 2,
      bottom: centerY + height / 2,
    }
  }

  const setNodeContentElement = (nodeId: string, element: HTMLElement | null) => {
    const previous = contentElementsRef.current.get(nodeId)

    if (previous && previous !== element) {
      contentObserverRef.current?.unobserve(previous)
      contentElementsRef.current.delete(nodeId)
    }

    if (element) {
      contentElementsRef.current.set(nodeId, element)
      contentObserverRef.current?.observe(element)
    }
  }

  const flushPendingNodeTransform = () => {
    const pending = pendingNodeTransformRef.current

    if (!pending) {
      nodeTransformFrameRef.current = null
      return
    }

    setNodes((current) =>
      current.map((node) => {
        if (pending.mode === "resize") {
          return node.id === pending.id
            ? {
                ...node,
                width: pending.width,
                height: pending.height,
                autoSize: false,
              }
            : node
        }

        const nextPosition = pending.positions[node.id]
        return nextPosition
          ? {
              ...node,
              x: nextPosition.x,
              y: nextPosition.y,
            }
          : node
      })
    )

    pendingNodeTransformRef.current = null
    nodeTransformFrameRef.current = null
  }

  const scheduleNodeTransformFlush = () => {
    if (nodeTransformFrameRef.current !== null) {
      return
    }

    nodeTransformFrameRef.current = requestAnimationFrame(flushPendingNodeTransform)
  }

  const isNodeInsideSelection = (node: CanvasNode, currentSelection: SelectionState) => {
    const bounds = getNodeScreenBounds(node)

    if (currentSelection.tool === "square") {
      const minX = Math.min(currentSelection.start.x, currentSelection.current.x)
      const maxX = Math.max(currentSelection.start.x, currentSelection.current.x)
      const minY = Math.min(currentSelection.start.y, currentSelection.current.y)
      const maxY = Math.max(currentSelection.start.y, currentSelection.current.y)

      return (
        bounds.right >= minX &&
        bounds.left <= maxX &&
        bounds.bottom >= minY &&
        bounds.top <= maxY
      )
    }

    if (currentSelection.tool === "circle") {
      const radius = Math.hypot(
        currentSelection.current.x - currentSelection.start.x,
        currentSelection.current.y - currentSelection.start.y
      )
      const nodeRadius = Math.max(bounds.width, bounds.height) / 2

      return (
        Math.hypot(
          bounds.centerX - currentSelection.start.x,
          bounds.centerY - currentSelection.start.y
        ) <= radius + nodeRadius
      )
    }

    let inside = false
    const points = currentSelection.points

    for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
      const point = points[index]
      const previousPoint = points[previous]
      const intersects =
        point.y > bounds.centerY !== previousPoint.y > bounds.centerY &&
        bounds.centerX <
          ((previousPoint.x - point.x) * (bounds.centerY - point.y)) /
            (previousPoint.y - point.y) +
            point.x

      if (intersects) {
        inside = !inside
      }
    }

    return inside
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button === 0) {
      const rect = event.currentTarget.getBoundingClientRect()
      const point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }

      setMenu(null)
      setSelectedNodeIds([])
      setEditingField(null)
      setEditingValue("")
      const nextSelection = {
        pointerId: event.pointerId,
        tool: selectionTool,
        start: point,
        current: point,
        points: [point],
      }
      selectionRef.current = nextSelection
      setSelectionState(nextSelection)
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }

    if (event.button !== 1) {
      return
    }

    event.preventDefault()
    setMenu(null)
    setEditingField(null)
    setEditingValue("")
    dragOriginRef.current = {
      x: event.clientX - offset.x,
      y: event.clientY - offset.y,
    }
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const nodeResize = nodeResizeRef.current

    if (nodeResize) {
      const deltaX = (event.clientX - nodeResize.startClientX) / zoom
      const deltaY = (event.clientY - nodeResize.startClientY) / zoom
      const resizedNode = nodes.find((node) => node.id === nodeResize.id)

    if (!resizedNode) {
      return
    }

      pendingNodeTransformRef.current = {
        mode: "resize",
        id: nodeResize.id,
        width: clamp(nodeResize.startWidth + deltaX, nodeResize.minWidth, 720),
        height: clamp(nodeResize.startHeight + deltaY, nodeResize.minHeight, 720),
      }
      scheduleNodeTransformFlush()
      return
    }

    const nodeDrag = nodeDragRef.current

    if (nodeDrag) {
      const deltaX = (event.clientX - nodeDrag.startClientX) / zoom
      const deltaY = (event.clientY - nodeDrag.startClientY) / zoom
      pendingNodeTransformRef.current = {
        mode: "drag",
        positions: Object.fromEntries(
          nodeDrag.ids.map((id) => [
            id,
            {
              x: nodeDrag.startPositions[id].x + deltaX,
              y: nodeDrag.startPositions[id].y + deltaY,
            },
          ])
        ),
      }
      scheduleNodeTransformFlush()
      return
    }

    const selection = selectionRef.current

    if (selection?.pointerId === event.pointerId) {
      const rect = event.currentTarget.getBoundingClientRect()
      const point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }

      const nextSelection = {
        ...selection,
        current: point,
        points: selection.tool === "draw" ? [...selection.points, point] : selection.points,
      }
      selectionRef.current = nextSelection
      setSelectionState(nextSelection)
      return
    }

    const dragOrigin = dragOriginRef.current

    if (!dragOrigin) {
      return
    }

    setOffset({
      x: event.clientX - dragOrigin.x,
      y: event.clientY - dragOrigin.y,
    })
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (selectionRef.current?.pointerId === event.pointerId) {
      const selection = selectionRef.current
      selectionRef.current = null
      setSelectionState(null)
      event.currentTarget.releasePointerCapture(event.pointerId)
      setSelectedNodeIds(nodes.filter((node) => isNodeInsideSelection(node, selection)).map((node) => node.id))
      return
    }

    if (nodeResizeRef.current?.pointerId === event.pointerId) {
      flushPendingNodeTransform()
      nodeResizeRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
      return
    }

    if (nodeDragRef.current?.pointerId === event.pointerId) {
      flushPendingNodeTransform()
      nodeDragRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
      return
    }

    if (!dragOriginRef.current) {
      return
    }

    dragOriginRef.current = null
    setIsDragging(false)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const toWorldPoint = (clientX: number, clientY: number, element: HTMLDivElement) => {
    const rect = element.getBoundingClientRect()
    const localX = clientX - rect.left
    const localY = clientY - rect.top

    return {
      screenX: localX,
      screenY: localY,
      worldX: (localX - viewport.width / 2 - offset.x) / zoom,
      worldY: (localY - viewport.height / 2 - offset.y) / zoom,
    }
  }

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()

    const rect = event.currentTarget.getBoundingClientRect()
    const pointerX = event.clientX - rect.left
    const pointerY = event.clientY - rect.top
    const centerX = viewport.width / 2
    const centerY = viewport.height / 2
    const worldX = (pointerX - centerX - offset.x) / zoom
    const worldY = (pointerY - centerY - offset.y) / zoom
    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9
    const nextZoom = clamp(Number((zoom * zoomFactor).toFixed(3)), 0.35, 4)

    setZoom(nextZoom)
    setOffset({
      x: pointerX - centerX - worldX * nextZoom,
      y: pointerY - centerY - worldY * nextZoom,
    })
  }

  const handleCanvasContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    setMenu(toWorldPoint(event.clientX, event.clientY, event.currentTarget))
  }

  const createNode = (type: CardType) => {
    if (!menu) {
      return
    }

    const newNode = createDefaultNode(type, menu.worldX, menu.worldY)
    setNodes((current) => {
      const position = findOpenPositionForNode(newNode, current, {
        x: menu.worldX,
        y: menu.worldY,
      })
      const placedNode = {
        ...newNode,
        x: position.x,
        y: position.y,
      }

      setSelectedNodeIds([placedNode.id])
      return [...current, placedNode]
    })
    setMenu(null)
  }

  const handleNodePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    node: CanvasNode
  ) => {
    if (event.button !== 0) {
      return
    }

    event.stopPropagation()
    const activeIds = selectedNodeIds.includes(node.id) ? selectedNodeIds : [node.id]

    setSelectedNodeIds(activeIds)
    setMenu(null)
    selectionRef.current = null
    setSelectionState(null)
    setEditingField(null)
    setEditingValue("")
    nodeDragRef.current = {
      ids: activeIds,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPositions: Object.fromEntries(
        nodes
          .filter((currentNode) => activeIds.includes(currentNode.id))
          .map((currentNode) => [currentNode.id, { x: currentNode.x, y: currentNode.y }])
      ),
    }
    containerRef.current?.setPointerCapture(event.pointerId)
  }

  const handleNodePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (nodeDragRef.current?.pointerId !== event.pointerId) {
      return
    }

    nodeDragRef.current = null
    containerRef.current?.releasePointerCapture(event.pointerId)
  }

  const handleResizePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    node: CanvasNode
  ) => {
    if (event.button !== 0) {
      return
    }

    const minSize = getNodeContentMinSize(node)

    event.stopPropagation()
    event.preventDefault()
    setSelectedNodeIds([node.id])
    setMenu(null)
    setEditingField(null)
    setEditingValue("")
    nodeResizeRef.current = {
      id: node.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: node.width,
      startHeight: node.height,
      minWidth: minSize.width,
      minHeight: minSize.height,
    }
    containerRef.current?.setPointerCapture(event.pointerId)
  }

  const getNodeStyle = (node: CanvasNode) => {
    const left = viewport.width / 2 + offset.x + node.x * zoom
    const top = viewport.height / 2 + offset.y + node.y * zoom

    return {
      left,
      top,
      transform: `translate(-50%, -50%) scale(${getNodeScale()})`,
      transformOrigin: "center center",
    }
  }

  const updateSelectedNode = (patch: Partial<CanvasNode>) => {
    if (!selectedNodeId) {
      return
    }

    setNodes((current) =>
      current.map((node) => (node.id === selectedNodeId ? { ...node, ...patch } : node))
    )
  }

  const getNodeSurfaceStyle = (node: CanvasNode) => {
    const isFlexibleHeightNode =
      node.type === "square-body" ||
      node.type === "square-title-body" ||
      node.type === "square-table" ||
      node.type === "square-list-column"
    const effectiveSize = getEffectiveNodeSize(node)

    return {
      backgroundColor: node.backgroundColor,
      opacity: node.opacity,
      color: node.textColor,
      fontSize: `${node.textSize}px`,
      fontWeight: node.textWeight,
      width: node.autoSize ? "fit-content" : `${effectiveSize.width}px`,
      height: isFlexibleHeightNode ? "auto" : node.autoSize ? "fit-content" : `${effectiveSize.height}px`,
      minWidth: `${effectiveSize.width}px`,
      minHeight: `${effectiveSize.height}px`,
      maxWidth: node.autoSize ? "max-content" : `${effectiveSize.width}px`,
      maxHeight: isFlexibleHeightNode
        ? "none"
        : node.autoSize
          ? "max-content"
          : `${effectiveSize.height}px`,
      overflow: "hidden",
    }
  }

  const getNodeTextStyle = (node: CanvasNode) => ({
    color: node.textColor,
    fontSize: `${node.textSize}px`,
    fontWeight: node.textWeight,
    opacity: node.opacity,
  })

  const renderEditableText = (
    node: CanvasNode,
    value: string,
    field: EditingField,
    className: string
  ) => {
    const isEditing = JSON.stringify(editingField) === JSON.stringify(field)

    if (isEditing) {
      const resizeEditor = (element: HTMLTextAreaElement) => {
        element.style.height = "0px"
        element.style.height = `${element.scrollHeight}px`
      }

      const updateFieldValue = (nextValue: string) => {
        setEditingValue(nextValue)
        updateNode(node.id, (current) => {
          if (field.kind === "title") {
            return { ...current, title: nextValue }
          }

          if (field.kind === "body") {
            return { ...current, body: nextValue }
          }

          if (field.kind === "table-column") {
            return {
              ...current,
              tableColumns: current.tableColumns.map((column, index) =>
                index === field.columnIndex ? nextValue : column
              ),
            }
          }

          if (field.kind === "table-cell") {
            return {
              ...current,
              tableRows: current.tableRows.map((row, rowIndex) =>
                rowIndex === field.rowIndex
                  ? row.map((cell, columnIndex) =>
                      columnIndex === field.columnIndex ? nextValue : cell
                    )
                  : row
              ),
            }
          }

          if (field.kind === "diagram-center") {
            return { ...current, title: nextValue }
          }

          if (field.kind !== "diagram-node") {
            return current
          }

          return {
            ...current,
            diagramNodes: current.diagramNodes.map((diagramNode, nodeIndex) =>
              nodeIndex === field.nodeIndex ? nextValue : diagramNode
            ),
          }
        })
      }

      return (
        <textarea
          autoFocus
          rows={1}
          value={editingValue}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            updateFieldValue(event.target.value)
            resizeEditor(event.target)
          }}
          onBlur={() => {
            setEditingField(null)
            setEditingValue("")
          }}
          onKeyDown={(event) => {
            if (field.kind !== "body" && event.key === "Enter") {
              event.preventDefault()
              setEditingField(null)
              setEditingValue("")
            }

            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault()
              setEditingField(null)
              setEditingValue("")
            }
          }}
          ref={(element) => {
            if (!element) {
              return
            }

            queueMicrotask(() => {
              resizeEditor(element)
              element.setSelectionRange(element.value.length, element.value.length)
            })
          }}
          className={`${className} block h-auto w-full min-w-0 resize-none overflow-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere] border-0 bg-transparent p-0 leading-[inherit] outline-none ring-0`}
        />
      )
    }

    return (
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => {
          event.stopPropagation()
          setEditingField(field)
          setEditingValue(value)
        }}
        className={`${className} block w-full min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] select-none text-inherit`}
      >
        {value}
      </button>
    )
  }

  const selection = selectionState

  return (
    <section className="relative h-[calc(100vh-4rem)] overflow-hidden bg-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.1),_transparent_24%)]" />

      <div
        ref={containerRef}
        className="relative h-full w-full touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onContextMenu={handleCanvasContextMenu}
      >
        <canvas
          ref={canvasRef}
          className={isDragging ? "block h-full w-full cursor-grabbing" : "block h-full w-full cursor-default"}
        />

        <div className="pointer-events-none absolute inset-0 z-[5]">
          {nodes.map((node) => (
            <div
              key={node.id}
              style={getNodeStyle(node)}
              className="pointer-events-auto absolute"
              onPointerDown={(event) => handleNodePointerDown(event, node)}
              onPointerUp={handleNodePointerUp}
              onClick={(event) => {
                event.stopPropagation()
                setSelectedNodeIds([node.id])
              }}
            >
              {selectedNodeIds.includes(node.id) && (
                <div className="absolute inset-[-6px] rounded-[1.35rem] border-2 border-sky-500/80 bg-sky-500/5" />
              )}

              {node.type === "square-body" && (
                <div
                  className="cursor-move rounded-2xl border border-border/80 p-4 shadow-lg backdrop-blur select-none"
                  style={getNodeSurfaceStyle(node)}
                  ref={(element) => setNodeContentElement(node.id, element)}
                  data-node-content-id={node.id}
                >
                  {renderEditableText(
                    node,
                    node.body,
                    { kind: "body", nodeId: node.id },
                    "text-left text-sm text-foreground"
                  )}
                </div>
              )}

              {node.type === "square-title-body" && (
                <div
                  className="flex cursor-move flex-col gap-2 rounded-2xl border border-border/80 p-4 shadow-lg backdrop-blur select-none"
                  style={getNodeSurfaceStyle(node)}
                  ref={(element) => setNodeContentElement(node.id, element)}
                  data-node-content-id={node.id}
                >
                  {renderEditableText(
                    node,
                    node.title,
                    { kind: "title", nodeId: node.id },
                    "mb-2 text-left text-sm font-semibold text-foreground"
                  )}
                  {renderEditableText(
                    node,
                    node.body,
                    { kind: "body", nodeId: node.id },
                    "text-left text-sm text-muted-foreground"
                  )}
                </div>
              )}

              {node.type === "square-table" && (
                <div
                  className="cursor-move rounded-2xl border border-border/80 p-4 shadow-lg backdrop-blur select-none"
                  style={getNodeSurfaceStyle(node)}
                  ref={(element) => setNodeContentElement(node.id, element)}
                  data-node-content-id={node.id}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    {renderEditableText(
                      node,
                      node.title,
                      { kind: "title", nodeId: node.id },
                      "text-left text-sm font-semibold text-foreground"
                    )}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation()
                          updateNode(node.id, (current) => ({
                            ...current,
                            tableColumns: [...current.tableColumns, `col ${current.tableColumns.length + 1}`],
                            tableRows: current.tableRows.map((row) => [...row, "new cell"]),
                          }))
                        }}
                        className="rounded-md border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
                      >
                        + col
                      </button>
                      <button
                        type="button"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation()
                          updateNode(node.id, (current) => ({
                            ...current,
                            tableRows: [
                              ...current.tableRows,
                              current.tableColumns.map(() => "new value"),
                            ],
                          }))
                        }}
                        className="rounded-md border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
                      >
                        + row
                      </button>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-border/70">
                    <div
                      className="bg-muted/60 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                      style={{ display: "grid", gridTemplateColumns: `repeat(${node.tableColumns.length}, minmax(0, 1fr))` }}
                    >
                      {node.tableColumns.map((column, columnIndex) => (
                        <div
                          key={`${node.id}-column-${columnIndex}`}
                          className="border-r border-border/70 px-3 py-2 last:border-r-0"
                        >
                          {renderEditableText(
                            node,
                            column,
                            { kind: "table-column", nodeId: node.id, columnIndex },
                            "w-full text-left text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                          )}
                        </div>
                      ))}
                    </div>
                    <div
                      className="text-sm text-muted-foreground"
                      style={{ display: "grid", gridTemplateColumns: `repeat(${node.tableColumns.length}, minmax(0, 1fr))` }}
                    >
                      {node.tableRows.flatMap((row, rowIndex) =>
                        row.map((cell, columnIndex) => (
                          <div
                            key={`${node.id}-cell-${rowIndex}-${columnIndex}`}
                            className="border-r border-t border-border/70 px-3 py-2 last:border-r-0"
                          >
                            {renderEditableText(
                              node,
                              cell,
                              { kind: "table-cell", nodeId: node.id, rowIndex, columnIndex },
                              "w-full text-left text-sm text-muted-foreground"
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {node.type === "square-list-column" && (
                <div
                  className="cursor-move rounded-2xl border border-border/80 p-4 shadow-lg backdrop-blur select-none"
                  style={getNodeSurfaceStyle(node)}
                  ref={(element) => setNodeContentElement(node.id, element)}
                  data-node-content-id={node.id}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    {renderEditableText(
                      node,
                      node.title,
                      { kind: "title", nodeId: node.id },
                      "text-left text-sm font-semibold text-foreground"
                    )}
                    <button
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation()
                        updateNode(node.id, (current) => ({
                          ...current,
                          tableRows: [...current.tableRows, ["new item"]],
                        }))
                      }}
                      className="rounded-md border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
                    >
                      +
                    </button>
                  </div>
                  <div className="space-y-2">
                    {node.tableRows.map((row, rowIndex) => (
                      <div
                        key={`${node.id}-list-item-${rowIndex}`}
                        className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/50 px-3 py-2"
                      >
                        <div className="flex min-w-0 flex-1">
                          {renderEditableText(
                            node,
                            row[0] ?? "",
                            { kind: "table-cell", nodeId: node.id, rowIndex, columnIndex: 0 },
                            "w-full text-left text-sm text-muted-foreground"
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <button
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation()
                              if (rowIndex === 0) {
                                return
                              }

                              updateNode(node.id, (current) => {
                                const nextRows = [...current.tableRows]
                                const previousRow = nextRows[rowIndex - 1]
                                nextRows[rowIndex - 1] = nextRows[rowIndex]
                                nextRows[rowIndex] = previousRow
                                return { ...current, tableRows: nextRows }
                              })
                            }}
                            className="rounded-md border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={rowIndex === 0}
                          >
                            up
                          </button>
                          <button
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation()
                              if (rowIndex === node.tableRows.length - 1) {
                                return
                              }

                              updateNode(node.id, (current) => {
                                const nextRows = [...current.tableRows]
                                const nextRow = nextRows[rowIndex + 1]
                                nextRows[rowIndex + 1] = nextRows[rowIndex]
                                nextRows[rowIndex] = nextRow
                                return { ...current, tableRows: nextRows }
                              })
                            }}
                            className="rounded-md border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={rowIndex === node.tableRows.length - 1}
                          >
                            down
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {node.type === "circle-body" && (
                <div
                  className="flex cursor-move items-center justify-center rounded-full border border-border/80 p-6 text-center shadow-lg backdrop-blur select-none"
                  style={getNodeSurfaceStyle(node)}
                  ref={(element) => setNodeContentElement(node.id, element)}
                  data-node-content-id={node.id}
                >
                  {renderEditableText(
                    node,
                    node.body,
                    { kind: "body", nodeId: node.id },
                    "text-center text-sm text-foreground"
                  )}
                </div>
              )}

              {node.type === "circle-diagram" && (
                <div
                  className="relative cursor-move select-none"
                  style={{
                    width: `${getEffectiveNodeSize(node).width}px`,
                    height: `${getEffectiveNodeSize(node).height}px`,
                  }}
                  ref={(element) => setNodeContentElement(node.id, element)}
                  data-node-content-id={node.id}
                >
                  {node.diagramNodes.map((_, nodeIndex) => {
                    const angle = (-Math.PI / 2) + (Math.PI * 2 * nodeIndex) / Math.max(node.diagramNodes.length, 1)
                    const radius = Math.min(node.width, node.height) * 0.34
                    const centerX = node.width / 2
                    const centerY = node.height / 2
                    const x = centerX + Math.cos(angle) * radius
                    const y = centerY + Math.sin(angle) * radius

                    return (
                      <div key={`${node.id}-connector-${nodeIndex}`}>
                        <div
                          className="absolute h-px origin-left bg-border"
                          style={{
                            left: `${centerX}px`,
                            top: `${centerY}px`,
                            width: `${Math.hypot(x - centerX, y - centerY)}px`,
                            transform: `rotate(${angle}rad)`,
                          }}
                        />
                        <div
                          className="absolute flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 px-3 text-center shadow-md backdrop-blur"
                          style={{
                            left: `${x}px`,
                            top: `${y}px`,
                            backgroundColor: node.backgroundColor,
                            ...getNodeTextStyle(node),
                          }}
                        >
                          {renderEditableText(
                            node,
                            node.diagramNodes[nodeIndex] ?? "",
                            { kind: "diagram-node", nodeId: node.id, nodeIndex },
                            "w-full text-center text-[11px]"
                          )}
                        </div>
                      </div>
                    )
                  })}

                  <div
                    className="absolute left-1/2 top-1/2 flex size-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 p-4 text-center shadow-lg backdrop-blur"
                    style={{
                      backgroundColor: node.backgroundColor,
                      ...getNodeTextStyle(node),
                    }}
                  >
                    {renderEditableText(
                      node,
                      node.title,
                      { kind: "diagram-center", nodeId: node.id },
                      "text-center text-sm text-foreground"
                    )}
                  </div>

                </div>
              )}

              {selectedNodeIds.includes(node.id) && (
                <button
                  type="button"
                  aria-label="Resize card"
                  className="absolute -bottom-2 -right-2 z-10 h-4 w-4 cursor-se-resize rounded-sm border border-border bg-background shadow-sm"
                  onPointerDown={(event) => handleResizePointerDown(event, node)}
                />
              )}
            </div>
          ))}
        </div>

        {selection && (
          <div className="pointer-events-none absolute inset-0 z-[6]">
            {selection.tool === "square" && (
              <div
                className="absolute border border-sky-500/80 bg-sky-500/10"
                style={{
                  left: Math.min(selection.start.x, selection.current.x),
                  top: Math.min(selection.start.y, selection.current.y),
                  width: Math.abs(selection.current.x - selection.start.x),
                  height: Math.abs(selection.current.y - selection.start.y),
                }}
              />
            )}

            {selection.tool === "circle" && (
              <div
                className="absolute rounded-full border border-sky-500/80 bg-sky-500/10"
                style={{
                  left:
                    selection.start.x -
                    Math.hypot(
                      selection.current.x - selection.start.x,
                      selection.current.y - selection.start.y
                    ),
                  top:
                    selection.start.y -
                    Math.hypot(
                      selection.current.x - selection.start.x,
                      selection.current.y - selection.start.y
                    ),
                  width:
                    Math.hypot(
                      selection.current.x - selection.start.x,
                      selection.current.y - selection.start.y
                    ) * 2,
                  height:
                    Math.hypot(
                      selection.current.x - selection.start.x,
                      selection.current.y - selection.start.y
                    ) * 2,
                }}
              />
            )}

            {selection.tool === "draw" && selection.points.length > 1 && (
              <svg className="absolute inset-0 h-full w-full">
                <path
                  d={`M ${selection.points.map((point) => `${point.x} ${point.y}`).join(" L ")} Z`}
                  fill="rgba(14, 165, 233, 0.1)"
                  stroke="rgba(14, 165, 233, 0.85)"
                  strokeWidth="1.5"
                />
              </svg>
            )}
          </div>
        )}

        <div className="absolute left-5 top-5 z-10" onPointerDown={stopCanvasPan}>
          <details className="rounded-xl border border-border/70 bg-background/90 shadow-md backdrop-blur">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <SettingsIcon />
              <span>settings</span>
            </summary>
            <div className="w-[220px] space-y-3 border-t border-border/60 p-3" onPointerDown={stopCanvasPan}>
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  type
                </span>
                <select
                  value={grid.type}
                  onChange={(event) =>
                    setGrid((current) => ({
                      ...current,
                      type: event.target.value as GridSettings["type"],
                    }))
                  }
                  className="h-8 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none"
                >
                  <option value="square">squared</option>
                  <option value="rounded">rounded</option>
                  <option value="web">spider</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    color
                  </span>
                  <input
                    type="color"
                    value={grid.color}
                    onChange={(event) =>
                      setGrid((current) => ({ ...current, color: event.target.value }))
                    }
                    className="h-8 w-full rounded-lg border border-border bg-transparent p-1"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    distance
                  </span>
                  <input
                    type="number"
                    min={10}
                    max={220}
                    value={grid.distance}
                    onChange={(event) =>
                      setGrid((current) => ({
                        ...current,
                        distance: clamp(Number(event.target.value) || current.distance, 10, 220),
                      }))
                    }
                    className="h-8 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    steps
                  </span>
                  <input
                    type="number"
                    min={2}
                    max={16}
                    value={grid.steps}
                    onChange={(event) =>
                      setGrid((current) => ({
                        ...current,
                        steps: clamp(Number(event.target.value) || current.steps, 2, 16),
                      }))
                    }
                    className="h-8 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    opacity
                  </span>
                  <input
                    type="range"
                    min={0.08}
                    max={1}
                    step={0.02}
                    value={grid.opacity}
                    onChange={(event) =>
                      setGrid((current) => ({
                        ...current,
                        opacity: clamp(Number(event.target.value), 0.08, 1),
                      }))
                    }
                    className="h-8 w-full accent-foreground"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    thickness
                  </span>
                  <input
                    type="range"
                    min={0.5}
                    max={3}
                    step={0.1}
                    value={grid.thickness}
                    onChange={(event) =>
                      setGrid((current) => ({
                        ...current,
                        thickness: clamp(Number(event.target.value), 0.5, 3),
                      }))
                    }
                    className="h-8 w-full accent-foreground"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => {
                  setOffset({ x: 0, y: 0 })
                  setGrid(DEFAULT_GRID)
                  setZoom(1)
                }}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-muted"
              >
                reset
              </button>
            </div>
          </details>
        </div>

        <div className="absolute left-1/2 top-5 z-10 flex -translate-x-1/2 items-center gap-2" onPointerDown={stopCanvasPan}>
          {(["square", "circle", "draw"] as SelectionTool[]).map((tool) => (
            <button
              key={tool}
              type="button"
              onClick={() => setSelectionTool(tool)}
              className={
                selectionTool === tool
                  ? "rounded-xl border border-sky-500/60 bg-sky-500/10 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-sky-600 shadow-sm backdrop-blur"
                  : "rounded-xl border border-border/70 bg-background/90 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground shadow-sm backdrop-blur transition hover:bg-muted"
              }
            >
              {`select_${tool}`}
            </button>
          ))}
        </div>

        <div className="absolute right-5 top-5 z-10 flex items-start gap-2" onPointerDown={stopCanvasPan}>
          <div className="rounded-xl border border-border/70 bg-background/90 px-3 py-2 shadow-md backdrop-blur">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              x_pos
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {Math.round(offset.x)}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/90 px-3 py-2 shadow-md backdrop-blur">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              y_pos
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {Math.round(offset.y)}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/90 px-3 py-2 shadow-md backdrop-blur">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              zoom
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {Math.round(zoom * 100)}%
            </p>
          </div>
        </div>

        {selectedNode && (
          <div
            className="absolute bottom-5 right-5 z-20 w-72 rounded-2xl border border-border/80 bg-background/95 p-4 shadow-xl backdrop-blur"
            onPointerDown={stopCanvasPan}
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              properties
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">id</span>
                <span className="truncate font-medium text-foreground">
                  {selectedNodeIds.length > 1 ? `${selectedNodeIds.length} selected` : selectedNode.id}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">type</span>
                <span className="font-medium text-foreground">
                  {selectedNodeIds.length > 1 ? "multi" : selectedNode.type}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">x</span>
                <span className="font-medium text-foreground">
                  {Math.round(selectedNode.x)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">y</span>
                <span className="font-medium text-foreground">
                  {Math.round(selectedNode.y)}
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              `Ctrl/Cmd + C` copy, `Ctrl/Cmd + V` paste, drag selected cards together.
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  size_mode
                </span>
                <select
                  value={selectedNode.autoSize ? "content" : "manual"}
                  onChange={(event) =>
                    updateSelectedNode({ autoSize: event.target.value === "content" })
                  }
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none"
                >
                  <option value="content">content-size</option>
                  <option value="manual">manual</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  bg_color
                </span>
                <input
                  type="color"
                  value={selectedNode.backgroundColor}
                  onChange={(event) =>
                    updateSelectedNode({ backgroundColor: event.target.value })
                  }
                  className="h-9 w-full rounded-lg border border-border bg-transparent p-1"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  opacity
                </span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={selectedNode.opacity}
                  onChange={(event) =>
                    updateSelectedNode({ opacity: clamp(Number(event.target.value), 0.1, 1) })
                  }
                  className="h-9 w-full accent-foreground"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  text_color
                </span>
                <input
                  type="color"
                  value={selectedNode.textColor}
                  onChange={(event) =>
                    updateSelectedNode({ textColor: event.target.value })
                  }
                  className="h-9 w-full rounded-lg border border-border bg-transparent p-1"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  text_size
                </span>
                <input
                  type="number"
                  min={10}
                  max={32}
                  value={selectedNode.textSize}
                  onChange={(event) =>
                    updateSelectedNode({
                      textSize: clamp(Number(event.target.value) || selectedNode.textSize, 10, 32),
                    })
                  }
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  text_weight
                </span>
                <input
                  type="number"
                  min={300}
                  max={800}
                  step={100}
                  value={selectedNode.textWeight}
                  onChange={(event) =>
                    updateSelectedNode({
                      textWeight: clamp(
                        Number(event.target.value) || selectedNode.textWeight,
                        300,
                        800
                      ),
                    })
                  }
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  width
                </span>
                <input
                  type="number"
                  min={80}
                  max={720}
                  value={selectedNode.width}
                  onChange={(event) =>
                    updateSelectedNode((() => {
                      const minSize = getNodeContentMinSize(selectedNode)
                      return {
                        width: clamp(
                          Number(event.target.value) || selectedNode.width,
                          minSize.width,
                          720
                        ),
                        autoSize: false,
                      }
                    })())
                  }
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none"
                />
              </label>

              <label className="space-y-1 col-span-2">
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  height
                </span>
                <input
                  type="number"
                  min={80}
                  max={720}
                  value={selectedNode.height}
                  onChange={(event) =>
                    updateSelectedNode((() => {
                      const minSize = getNodeContentMinSize(selectedNode)
                      return {
                        height: clamp(
                          Number(event.target.value) || selectedNode.height,
                          minSize.height,
                          720
                        ),
                        autoSize: false,
                      }
                    })())
                  }
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none"
                />
              </label>
            </div>
          </div>
        )}

        {menu && (
          <div
            className="absolute z-20 min-w-64 rounded-2xl border border-border/80 bg-background/95 p-2 shadow-xl backdrop-blur"
            style={{
              left: Math.min(menu.screenX, Math.max(12, viewport.width - 280)),
              top: Math.min(menu.screenY, Math.max(12, viewport.height - 260)),
            }}
            onPointerDown={stopCanvasPan}
          >
            <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              create card
            </p>
            <div className="space-y-1">
              {CARD_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => createNode(option.type)}
                  className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default InfiniteCanvas
