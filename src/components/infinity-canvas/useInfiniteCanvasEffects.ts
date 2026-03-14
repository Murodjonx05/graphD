import { useEffect } from "react"
import type { CanvasNode, GridSettings, Point } from "./types"
import { drawRoundedGrid, drawSquareGrid, drawWebGrid } from "./grid"

type Params = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  grid: GridSettings
  offset: Point
  viewport: { width: number; height: number }
  zoom: number
  themeVersion: number
  nodes: CanvasNode[]
  selectedNodeIds: string[]
  clipboardNodes: CanvasNode[]
  setClipboardNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<string[]>>
  setEditingField: React.Dispatch<React.SetStateAction<import("./types").EditingField | null>>
  findOpenPositionForNode: (node: CanvasNode, existing: CanvasNode[], preferred: Point) => Point
  isFocusInTextEditable: () => boolean
}

export function useInfiniteCanvasEffects({
  canvasRef,
  grid,
  offset,
  viewport,
  zoom,
  themeVersion,
  nodes,
  selectedNodeIds,
  clipboardNodes,
  setClipboardNodes,
  setNodes,
  setSelectedNodeIds,
  setEditingField,
  findOpenPositionForNode,
  isFocusInTextEditable,
}: Params) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const inText = isFocusInTextEditable()
      const isCopy = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c"
      const isCut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "x"
      const isPaste = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v"
      const isDelete = event.key === "Delete" || event.key === "Backspace"
      if (isCopy && !inText && selectedNodeIds.length > 0) {
        event.preventDefault()
        setClipboardNodes(nodes.filter((n) => selectedNodeIds.includes(n.id)).map((n) => ({ ...n })))
      }
      if (isCut && !inText && selectedNodeIds.length > 0) {
        event.preventDefault()
        setClipboardNodes(nodes.filter((n) => selectedNodeIds.includes(n.id)).map((n) => ({ ...n })))
        setNodes((current) => current.filter((n) => !selectedNodeIds.includes(n.id)))
        setSelectedNodeIds([])
        setEditingField(null)
      }
      if (isPaste && !inText && clipboardNodes.length > 0) {
        event.preventDefault()
        const placedNodes = [...nodes]
        const newNodes = clipboardNodes.map((node, index) => {
          const duplicate = { ...node, id: `${node.type}-${crypto.randomUUID()}` }
          const preferred = { x: node.x + 48 + index * 12, y: node.y }
          const position = findOpenPositionForNode(duplicate, placedNodes, preferred)
          const placedNode = { ...duplicate, x: position.x, y: position.y }
          placedNodes.push(placedNode)
          return placedNode
        })
        setNodes(placedNodes)
        setSelectedNodeIds(newNodes.map((n) => n.id))
      }
      if (isDelete && !inText && selectedNodeIds.length > 0) {
        event.preventDefault()
        setNodes((current) => current.filter((n) => !selectedNodeIds.includes(n.id)))
        setSelectedNodeIds([])
        setEditingField(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    clipboardNodes,
    findOpenPositionForNode,
    isFocusInTextEditable,
    nodes,
    selectedNodeIds,
    setClipboardNodes,
    setEditingField,
    setNodes,
    setSelectedNodeIds,
  ])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || viewport.width === 0 || viewport.height === 0) return
    const context = canvas.getContext("2d")
    if (!context) return
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
  }, [canvasRef, grid, offset, themeVersion, viewport, zoom])
}
