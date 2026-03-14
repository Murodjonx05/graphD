import { useRef } from "react"
import type { CardType, CanvasNode, ConnectionDrag } from "./types"
import { createDefaultNode } from "./node-utils"
import { getTableColumnAtPoint, isCircleLikeNode } from "./node-utils"
import { getNodeResolvedBaseMinSize, isFlexibleHeightCard } from "./node-utils"
import { clamp } from "./grid"
import { useInfiniteCanvasState } from "./useInfiniteCanvasState"

export function useInfiniteCanvasHandlers(ctx: ReturnType<typeof useInfiniteCanvasState>) {
  const {
    refs: {
      containerRef,
      dragOriginRef,
      nodeDragRef,
      nodeResizeRef,
      pendingNodeTransformRef,
      selectionRef,
    },
    state: {
      menu,
      nodes,
      offset,
      selectedNodeIds,
      selectionTool,
      viewport,
      zoom,
    },
    setMenu,
    setNodes,
    setSelectedNodeIds,
    setSelectionState,
    setEditingField,
    setEditingValue,
    setConnectionDrag,
    setTableEdges,
    setIsDragging,
    setOffset,
    setZoom,
    getNodeScale,
    getEffectiveNodeSize,
    getNodeResizeMinSize,
    findOpenPositionForNode,
    flushPendingNodeTransform,
    scheduleNodeTransformFlush,
    isNodeInsideSelection,
  } = ctx

  const connectionDragRef = useRef<ConnectionDrag | null>(null)

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button === 0) {
      const rect = event.currentTarget.getBoundingClientRect()
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      setMenu(null)
      setSelectedNodeIds([])
      setEditingField(null)
      setEditingValue("")
      setConnectionDrag(null)
      connectionDragRef.current = null
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
    if (event.button !== 1) return
    event.preventDefault()
    setMenu(null)
    setEditingField(null)
    setEditingValue("")
    dragOriginRef.current = { x: event.clientX - offset.x, y: event.clientY - offset.y }
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const connDrag = connectionDragRef.current
    if (connDrag) {
      const rect = event.currentTarget.getBoundingClientRect()
      const endX = event.clientX - rect.left
      const endY = event.clientY - rect.top
      const next = { ...connDrag, endX, endY }
      connectionDragRef.current = next
      setConnectionDrag(next)
      return
    }
    const nodeResize = nodeResizeRef.current
    if (nodeResize) {
      const deltaX = (event.clientX - nodeResize.startClientX) / zoom
      const deltaY = (event.clientY - nodeResize.startClientY) / zoom
      const resizedNode = nodes.find((n) => n.id === nodeResize.id)
      if (!resizedNode) return
      const rawW = nodeResize.startWidth + deltaX
      const rawH = nodeResize.startHeight + deltaY
      const minSide = Math.min(nodeResize.minWidth, nodeResize.minHeight)
      if (isCircleLikeNode(resizedNode)) {
        const size = clamp(Math.max(rawW, rawH), minSide, 720)
        pendingNodeTransformRef.current = { mode: "resize", id: nodeResize.id, width: size, height: size }
      } else {
        pendingNodeTransformRef.current = {
          mode: "resize",
          id: nodeResize.id,
          width: clamp(rawW, nodeResize.minWidth, 720),
          height: clamp(rawH, nodeResize.minHeight, 720),
        }
      }
      scheduleNodeTransformFlush()
      return
    }
    const nodeDrag = nodeDragRef.current
    if (nodeDrag) {
      const deltaX = (event.clientX - nodeDrag.startClientX) / zoom
      const deltaY = (event.clientY - nodeDrag.startClientY) / zoom
      if (!nodeDrag.active) {
        const distance = Math.hypot(event.clientX - nodeDrag.startClientX, event.clientY - nodeDrag.startClientY)
        if (distance < 4) return
        nodeDragRef.current = { ...nodeDrag, active: true }
        containerRef.current?.setPointerCapture(event.pointerId)
      }
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
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top }
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
    if (!dragOrigin) return
    setOffset({ x: event.clientX - dragOrigin.x, y: event.clientY - dragOrigin.y })
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const connDrag = connectionDragRef.current
    if (connDrag) {
      connectionDragRef.current = null
      setConnectionDrag(null)
      event.currentTarget.releasePointerCapture(event.pointerId)
      const rect = event.currentTarget.getBoundingClientRect()
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      const target = getTableColumnAtPoint(nodes, point, getNodeStyle, getEffectiveNodeSize, getNodeScale())
      if (
        target &&
        (target.nodeId !== connDrag.sourceNodeId || target.columnIndex !== connDrag.sourceColumnIndex)
      ) {
        setTableEdges((prev) => [
          ...prev,
          {
            id: `edge-${crypto.randomUUID()}`,
            sourceNodeId: connDrag.sourceNodeId,
            sourceColumnIndex: connDrag.sourceColumnIndex,
            targetNodeId: target.nodeId,
            targetColumnIndex: target.columnIndex,
          },
        ])
      }
      return
    }
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
      if (nodeDragRef.current.active) event.currentTarget.releasePointerCapture(event.pointerId)
      nodeDragRef.current = null
      return
    }
    if (!dragOriginRef.current) return
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
    const nextZoom = clamp(Number((zoom * zoomFactor).toFixed(3)), 0.1, 1)
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
    if (!menu) return
    const newNode = createDefaultNode(type, menu.worldX, menu.worldY)
    const position = findOpenPositionForNode(newNode, nodes, { x: menu.worldX, y: menu.worldY })
    const placedNode = { ...newNode, x: position.x, y: position.y }
    setNodes((current) => [...current, placedNode])
    setSelectedNodeIds([placedNode.id])
    setMenu(null)
  }

  const handleNodePointerDown = (event: React.PointerEvent<HTMLDivElement>, node: CanvasNode) => {
    if (event.button !== 0) return
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
      active: false,
      startPositions: Object.fromEntries(
        nodes.filter((n) => activeIds.includes(n.id)).map((n) => [n.id, { x: n.x, y: n.y }])
      ),
    }
  }

  const handleNodePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (nodeDragRef.current?.pointerId !== event.pointerId) return
    if (nodeDragRef.current.active) containerRef.current?.releasePointerCapture(event.pointerId)
    nodeDragRef.current = null
  }

  const handleResizePointerDown = (event: React.PointerEvent<HTMLButtonElement>, node: CanvasNode) => {
    if (event.button !== 0) return
    const minSize = getNodeResizeMinSize(node)
    const effectiveSize = getEffectiveNodeSize(node)
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
      startWidth: effectiveSize.width,
      startHeight: effectiveSize.height,
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
    if (selectedNodeIds.length === 0) return
    const idSet = new Set(selectedNodeIds)
    setNodes((current) => current.map((node) => (idSet.has(node.id) ? { ...node, ...patch } : node)))
  }

  const onConnectionDragStart = (
    nodeId: string,
    columnIndex: number,
    clientX: number,
    clientY: number,
    pointerId: number
  ) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const drag: ConnectionDrag = {
      sourceNodeId: nodeId,
      sourceColumnIndex: columnIndex,
      endX: clientX - rect.left,
      endY: clientY - rect.top,
    }
    connectionDragRef.current = drag
    setConnectionDrag(drag)
    el.setPointerCapture(pointerId)
  }

  const getNodeSurfaceStyle = (node: CanvasNode) => {
    const isFlexibleHeightNode = isFlexibleHeightCard(node.type)
    const effectiveSize = getEffectiveNodeSize(node)
    const baseMinSize = getNodeResolvedBaseMinSize(node)
    const widthValue =
      isFlexibleHeightNode ? `${effectiveSize.width}px` : node.autoSize ? "fit-content" : `${effectiveSize.width}px`
    return {
      backgroundColor: node.backgroundColor,
      opacity: node.opacity,
      width: widthValue,
      height: isFlexibleHeightNode ? "auto" : node.autoSize ? "fit-content" : `${effectiveSize.height}px`,
      minWidth: `${effectiveSize.width}px`,
      minHeight: isFlexibleHeightNode ? `${baseMinSize.height}px` : `${effectiveSize.height}px`,
      maxWidth: isFlexibleHeightNode ? `${effectiveSize.width}px` : node.autoSize ? "max-content" : `${effectiveSize.width}px`,
      maxHeight: isFlexibleHeightNode ? "none" : node.autoSize ? "max-content" : `${effectiveSize.height}px`,
      overflow: "hidden",
    }
  }

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    toWorldPoint,
    handleWheel,
    handleCanvasContextMenu,
    createNode,
    handleNodePointerDown,
    handleNodePointerUp,
    handleResizePointerDown,
    getNodeStyle,
    updateSelectedNode,
    getNodeSurfaceStyle,
    onConnectionDragStart,
  }
}
