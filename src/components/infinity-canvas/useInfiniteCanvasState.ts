import { useCallback, useEffect, useRef, useState } from "react"
import type {
  CanvasNode,
  ConnectionDrag,
  EditingField,
  GridSettings,
  MenuState,
  NodeDragState,
  NodeResizeState,
  Point,
  SelectionState,
  Size,
  TableEdge,
} from "./types"
import {
  DEFAULT_GRID,
} from "./types"
import {
  getNodeBaseMinSize,
  getNodeResolvedBaseMinSize,
  isCircleLikeNode,
  isFlexibleHeightCard,
} from "./node-utils"
import { clamp } from "./grid"

export function useInfiniteCanvasState() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const nodesRef = useRef<CanvasNode[]>([])
  const dragOriginRef = useRef<Point | null>(null)
  const nodeDragRef = useRef<NodeDragState | null>(null)
  const nodeResizeRef = useRef<NodeResizeState | null>(null)
  const selectionRef = useRef<SelectionState | null>(null)
  const contentObserverRef = useRef<ResizeObserver | null>(null)
  const contentElementsRef = useRef(new Map<string, HTMLElement>())
  const tableContentRef = useRef(new Map<string, HTMLElement>())
  const nodeTransformFrameRef = useRef<number | null>(null)
  const pendingNodeTransformRef = useRef<import("./types").PendingNodeTransform | null>(null)

  const [grid, setGrid] = useState<GridSettings>(DEFAULT_GRID)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [themeVersion, setThemeVersion] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [nodes, setNodes] = useState<CanvasNode[]>([])
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [selectionTool, setSelectionTool] = useState<import("./types").SelectionTool>("square")
  const [selectionState, setSelectionState] = useState<SelectionState | null>(null)
  const [clipboardNodes, setClipboardNodes] = useState<CanvasNode[]>([])
  const [editingField, setEditingField] = useState<EditingField | null>(null)
  const [editingValue, setEditingValue] = useState("")
  const [contentMinSizes, setContentMinSizes] = useState<Record<string, Size>>({})
  const [tableEdges, setTableEdges] = useState<TableEdge[]>([])
  const [connectionDrag, setConnectionDrag] = useState<ConnectionDrag | null>(null)

  const selectedNodeId = selectedNodeIds[0] ?? null
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  const updateNode = useCallback((nodeId: string, updater: (node: CanvasNode) => CanvasNode) => {
    setNodes((current) => current.map((node) => (node.id === nodeId ? updater(node) : node)))
  }, [])

  const stopCanvasPan = useCallback((event: React.PointerEvent<HTMLElement>) => {
    event.stopPropagation()
  }, [])

  useEffect(() => {
    const updateViewport = () => {
      const container = containerRef.current
      if (!container) return
      setViewport({ width: container.clientWidth, height: container.clientHeight })
    }
    updateViewport()
    const resizeObserver = new ResizeObserver(updateViewport)
    const current = containerRef.current
    if (current) resizeObserver.observe(current)
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
          const nodeId = element.dataset.nodeContentId ?? element.dataset.tableWrapperId ?? null
          if (!nodeId) continue
          if (nodeResizeRef.current?.id === nodeId) continue
          const node = nodesRef.current.find((n) => n.id === nodeId)
          const previous = current[nodeId]
          const nodeType = node?.type ?? "square-body"
          const baseMinSize = node ? getNodeResolvedBaseMinSize(node) : getNodeBaseMinSize(nodeType)
          const isTable = nodeType === "square-table"
          const isTableWrapperEntry = Boolean(element.dataset.tableWrapperId)

          let contentWidth: number
          let contentHeight: number
          if (isTableWrapperEntry && isTable) {
            contentWidth = baseMinSize.width
            contentHeight = previous ? previous.height : baseMinSize.height
          } else {
            contentWidth = isTable
              ? baseMinSize.width
              : Math.ceil(Math.max(baseMinSize.width, element.scrollWidth))
            contentHeight = Math.ceil(Math.max(baseMinSize.height, element.scrollHeight))
          }
          const isFlexibleCard = isFlexibleHeightCard(nodeType)
          const width = isTable
            ? contentWidth
            : isFlexibleCard
              ? baseMinSize.width
              : node?.autoSize
                ? contentWidth
                : Math.max(baseMinSize.width, previous?.width ?? baseMinSize.width)
          const height = isTableWrapperEntry
            ? (previous?.height ?? baseMinSize.height)
            : (isFlexibleCard
                ? contentHeight
                : Math.max(baseMinSize.height, previous?.height ?? baseMinSize.height, contentHeight))
          if (!previous || previous.width !== width || previous.height !== height) {
            next[nodeId] = { width, height }
            changed = true
          }
        }
        return changed ? next : current
      })
    })
    contentObserverRef.current = observer
    contentElementsRef.current.forEach((el) => observer.observe(el))
    return () => {
      observer.disconnect()
      contentObserverRef.current = null
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => setThemeVersion((c) => c + 1))
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    const handleThemeChange = () => setThemeVersion((c) => c + 1)
    window.addEventListener("themechange", handleThemeChange)
    return () => {
      observer.disconnect()
      window.removeEventListener("themechange", handleThemeChange)
    }
  }, [])

  const getNodeContentMinSize = useCallback((node: CanvasNode) => {
    const measured = contentMinSizes[node.id]
    const baseMinSize = getNodeResolvedBaseMinSize(node)
    const isFlexibleCard = isFlexibleHeightCard(node.type)
    const isTable = node.type === "square-table"
    const minWidth = isTable
      ? Math.max(baseMinSize.width, measured ? measured.width : baseMinSize.width)
      : isFlexibleCard
        ? baseMinSize.width
        : node.autoSize
          ? Math.max(baseMinSize.width, measured ? measured.width : baseMinSize.width)
          : baseMinSize.width
    return {
      width: minWidth,
      height: Math.max(baseMinSize.height, measured ? measured.height : baseMinSize.height),
    }
  }, [contentMinSizes])

  const getEffectiveNodeSize = useCallback((node: CanvasNode) => {
    const minSize = getNodeContentMinSize(node)
    if (isCircleLikeNode(node)) {
      const side = Math.max(node.width, node.height, minSize.width, minSize.height)
      return { width: side, height: side }
    }
    return {
      width: Math.max(node.width, minSize.width),
      height: Math.max(node.height, minSize.height),
    }
  }, [getNodeContentMinSize])

  const getNodeResizeMinSize = useCallback((node: CanvasNode) => {
    const contentMinSize = getNodeContentMinSize(node)
    const baseMinSize = getNodeResolvedBaseMinSize(node)
    return {
      width: isFlexibleHeightCard(node.type) ? baseMinSize.width : contentMinSize.width,
      height: contentMinSize.height,
    }
  }, [getNodeContentMinSize])

  const syncNodeContentMinSize = useCallback((nodeId: string) => {
    const element = contentElementsRef.current.get(nodeId)
    const node = nodesRef.current.find((n) => n.id === nodeId)
    if (!element || !node) return
    const baseMinSize = getNodeResolvedBaseMinSize(node)
    const isFlexibleCard = isFlexibleHeightCard(node.type)
    const isTable = node.type === "square-table"
    const contentWidth = isTable
      ? baseMinSize.width
      : Math.ceil(Math.max(baseMinSize.width, element.scrollWidth))
    const nextSize = {
      width: isTable ? contentWidth : isFlexibleCard ? baseMinSize.width : contentWidth,
      height: Math.ceil(Math.max(baseMinSize.height, element.scrollHeight)),
    }
    setContentMinSizes((current) => {
      const previous = current[nodeId]
      if (previous && previous.width === nextSize.width && previous.height === nextSize.height) {
        return current
      }
      return { ...current, [nodeId]: nextSize }
    })
  }, [])

  const nodesOverlap = useCallback(
    (
      first: { x: number; y: number; width: number; height: number },
      second: { x: number; y: number; width: number; height: number },
      gap = 24
    ) =>
      Math.abs(first.x - second.x) < (first.width + second.width) / 2 + gap &&
      Math.abs(first.y - second.y) < (first.height + second.height) / 2 + gap,
    []
  )

  const findOpenPositionForNode = useCallback(
    (node: CanvasNode, existingNodes: CanvasNode[], preferred: Point) => {
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
      if (!collidesAt(preferred.x, preferred.y)) return preferred
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const rightCandidate = { x: preferred.x + step * attempt, y: preferred.y }
        const leftCandidate = { x: preferred.x - step * attempt, y: preferred.y }
        if (!collidesAt(rightCandidate.x, rightCandidate.y)) return rightCandidate
        if (!collidesAt(leftCandidate.x, leftCandidate.y)) return leftCandidate
      }
      return { x: preferred.x + step * (maxAttempts + 1), y: preferred.y }
    },
    [getEffectiveNodeSize, grid.distance, nodesOverlap]
  )

  const isFocusInTextEditable = useCallback(() => {
    const el = document.activeElement
    if (!el || !(el instanceof HTMLElement)) return false
    if (el.tagName === "TEXTAREA") return true
    if (el.tagName === "INPUT") {
      const type = (el as HTMLInputElement).type?.toLowerCase()
      return ["text", "search", "email", "url", "password", "number"].includes(type)
    }
    return el.isContentEditable
  }, [])

  const getNodeScale = useCallback(() => clamp(zoom, 0.1, 1), [zoom])

  const getNodeScreenBounds = useCallback(
    (node: CanvasNode) => {
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
    },
    [getEffectiveNodeSize, getNodeScale, offset.x, offset.y, viewport.height, viewport.width, zoom]
  )

  const setNodeContentElement = useCallback((nodeId: string, element: HTMLElement | null) => {
    const previous = contentElementsRef.current.get(nodeId)
    if (previous && previous !== element) {
      contentObserverRef.current?.unobserve(previous)
      contentElementsRef.current.delete(nodeId)
    }
    if (element) {
      contentElementsRef.current.set(nodeId, element)
      contentObserverRef.current?.observe(element)
    }
  }, [])

  const setTableWrapperElement = useCallback((nodeId: string, element: HTMLElement | null) => {
    const previous = tableContentRef.current.get(nodeId)
    if (previous && previous !== element) {
      contentObserverRef.current?.unobserve(previous)
      tableContentRef.current.delete(nodeId)
    }
    if (element) {
      tableContentRef.current.set(nodeId, element)
      contentObserverRef.current?.observe(element)
      requestAnimationFrame(() => syncNodeContentMinSize(nodeId))
    }
  }, [syncNodeContentMinSize])

  const flushPendingNodeTransform = useCallback(() => {
    const pending = pendingNodeTransformRef.current
    if (!pending) {
      nodeTransformFrameRef.current = null
      return
    }
    setNodes((current) =>
      current.map((node) => {
        if (pending.mode === "resize" && node.id === pending.id) {
          if (isCircleLikeNode(node)) {
            const minSize = getNodeResizeMinSize(node)
            const minSide = Math.min(minSize.width, minSize.height)
            const size = clamp(Math.max(pending.width, pending.height), minSide, 720)
            return { ...node, width: size, height: size, autoSize: false }
          }
          return { ...node, width: pending.width, height: pending.height, autoSize: false }
        }
        if (pending.mode === "resize") return node
        const nextPosition = pending.positions[node.id]
        return nextPosition ? { ...node, x: nextPosition.x, y: nextPosition.y } : node
      })
    )
    pendingNodeTransformRef.current = null
    nodeTransformFrameRef.current = null
  }, [getNodeResizeMinSize])

  const scheduleNodeTransformFlush = useCallback(() => {
    if (nodeTransformFrameRef.current !== null) return
    nodeTransformFrameRef.current = requestAnimationFrame(flushPendingNodeTransform)
  }, [flushPendingNodeTransform])

  const isNodeInsideSelection = useCallback(
    (node: CanvasNode, currentSelection: SelectionState) => {
      const bounds = getNodeScreenBounds(node)
      if (currentSelection.tool === "square") {
        const minX = Math.min(currentSelection.start.x, currentSelection.current.x)
        const maxX = Math.max(currentSelection.start.x, currentSelection.current.x)
        const minY = Math.min(currentSelection.start.y, currentSelection.current.y)
        const maxY = Math.max(currentSelection.start.y, currentSelection.current.y)
        return bounds.right >= minX && bounds.left <= maxX && bounds.bottom >= minY && bounds.top <= maxY
      }
      if (currentSelection.tool === "circle") {
        const radius = Math.hypot(
          currentSelection.current.x - currentSelection.start.x,
          currentSelection.current.y - currentSelection.start.y
        )
        const nodeRadius = Math.max(bounds.width, bounds.height) / 2
        return (
          Math.hypot(bounds.centerX - currentSelection.start.x, bounds.centerY - currentSelection.start.y) <=
          radius + nodeRadius
        )
      }
      let inside = false
      const points = currentSelection.points
      for (let index = 0, prev = points.length - 1; index < points.length; prev = index, index += 1) {
        const point = points[index]
        const previousPoint = points[prev]
        const intersects =
          point.y > bounds.centerY !== previousPoint.y > bounds.centerY &&
          bounds.centerX <
            ((previousPoint.x - point.x) * (bounds.centerY - point.y)) / (previousPoint.y - point.y) + point.x
        if (intersects) inside = !inside
      }
      return inside
    },
    [getNodeScreenBounds]
  )

  return {
    refs: {
      canvasRef,
      containerRef,
      nodesRef,
      dragOriginRef,
      nodeDragRef,
      nodeResizeRef,
      selectionRef,
      contentObserverRef,
      contentElementsRef,
      tableContentRef,
      nodeTransformFrameRef,
      pendingNodeTransformRef,
    },
    state: {
      grid,
      offset,
      viewport,
      isDragging,
      themeVersion,
      zoom,
      menu,
      nodes,
      selectedNodeIds,
      selectionTool,
      selectionState,
      clipboardNodes,
      editingField,
      editingValue,
      contentMinSizes,
      tableEdges,
      connectionDrag,
      selectedNodeId,
      selectedNode,
    },
    setGrid,
    setOffset,
    setViewport,
    setIsDragging,
    setThemeVersion,
    setZoom,
    setMenu,
    setNodes,
    setSelectedNodeIds,
    setSelectionTool,
    setSelectionState,
    setClipboardNodes,
    setEditingField,
    setEditingValue,
    setContentMinSizes,
    setTableEdges,
    setConnectionDrag,
    updateNode,
    stopCanvasPan,
    getNodeContentMinSize,
    getEffectiveNodeSize,
    getNodeResizeMinSize,
    syncNodeContentMinSize,
    nodesOverlap,
    findOpenPositionForNode,
    isFocusInTextEditable,
    getNodeScale,
    getNodeScreenBounds,
    setNodeContentElement,
    setTableWrapperElement,
    flushPendingNodeTransform,
    scheduleNodeTransformFlush,
    isNodeInsideSelection,
  }
}
