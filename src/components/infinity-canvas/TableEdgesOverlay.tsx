import type { CanvasNode, ConnectionDrag, TableEdge } from "./types"
import type { Size } from "./types"
import { TABLE_CARD_PADDING_X, TABLE_LIST_ITEM_HEIGHT, TABLE_WRAPPER_OFFSET_Y } from "./types"

const PORT_BUTTON_SIZE = 20
const ROUTE_GAP = 30
const ROUTE_CLEARANCE = 16

type Props = {
  nodes: CanvasNode[]
  tableEdges: TableEdge[]
  connectionDrag: ConnectionDrag | null
  getNodeStyle: (node: CanvasNode) => { left: number; top: number }
  getEffectiveNodeSize: (node: CanvasNode) => Size
  getNodeScale: () => number
}

type AnchorSide = "left" | "right"

type AnchorPoint = {
  x: number
  y: number
  side: AnchorSide
}

type Rect = {
  left: number
  right: number
  top: number
  bottom: number
}

function getColumnAnchorY(
  columnIndex: number,
  style: { left: number; top: number },
  size: Size,
  scale: number
) {
  const h = size.height * scale
  const offsetY = TABLE_WRAPPER_OFFSET_Y * scale
  const itemHeight = TABLE_LIST_ITEM_HEIGHT * scale
  return style.top - h / 2 + offsetY + columnIndex * itemHeight + itemHeight / 2
}

function getColumnSideAnchors(
  columnIndex: number,
  style: { left: number; top: number },
  size: Size,
  scale: number
): { left: AnchorPoint; right: AnchorPoint } {
  const w = size.width * scale
  const paddingX = (TABLE_CARD_PADDING_X / 2) * scale
  const wrapperLeft = style.left - w / 2 + paddingX
  const wrapperRight = style.left + w / 2 - paddingX
  const portCenterOffset = (PORT_BUTTON_SIZE / 2) * scale
  const y = getColumnAnchorY(columnIndex, style, size, scale)

  return {
    left: { x: wrapperLeft + portCenterOffset, y, side: "left" },
    right: { x: wrapperRight - portCenterOffset, y, side: "right" },
  }
}

function getNodeRect(style: { left: number; top: number }, size: Size, scale: number): Rect {
  const width = size.width * scale
  const height = size.height * scale
  return {
    left: style.left - width / 2,
    right: style.left + width / 2,
    top: style.top - height / 2,
    bottom: style.top + height / 2,
  }
}

function segmentIntersectsRect(a: { x: number; y: number }, b: { x: number; y: number }, rect: Rect) {
  const left = rect.left - ROUTE_CLEARANCE
  const right = rect.right + ROUTE_CLEARANCE
  const top = rect.top - ROUTE_CLEARANCE
  const bottom = rect.bottom + ROUTE_CLEARANCE

  if (a.x === b.x) {
    const minY = Math.min(a.y, b.y)
    const maxY = Math.max(a.y, b.y)
    return a.x >= left && a.x <= right && maxY >= top && minY <= bottom
  }

  if (a.y === b.y) {
    const minX = Math.min(a.x, b.x)
    const maxX = Math.max(a.x, b.x)
    return a.y >= top && a.y <= bottom && maxX >= left && minX <= right
  }

  return false
}

function compactPoints(points: Array<{ x: number; y: number }>) {
  return points.filter((point, index) => {
    if (index === 0 || index === points.length - 1) return true
    const previous = points[index - 1]
    const next = points[index + 1]
    const sameX = previous.x === point.x && point.x === next.x
    const sameY = previous.y === point.y && point.y === next.y
    return !sameX && !sameY
  })
}

function polylineLength(points: Array<{ x: number; y: number }>) {
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    total += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y)
  }
  return total
}

function candidateIsClear(points: Array<{ x: number; y: number }>, obstacles: Rect[]) {
  for (let index = 1; index < points.length; index += 1) {
    if (obstacles.some((rect) => segmentIntersectsRect(points[index - 1], points[index], rect))) {
      return false
    }
  }
  return true
}

function pointsToPath(points: Array<{ x: number; y: number }>) {
  return compactPoints(points)
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ")
}

function pickBestAnchorPair(
  sourceColumnIndex: number,
  sourceStyle: { left: number; top: number },
  sourceSize: Size,
  targetColumnIndex: number,
  targetStyle: { left: number; top: number },
  targetSize: Size,
  scale: number,
  otherRects: Rect[]
): { start: AnchorPoint; end: AnchorPoint } {
  const sourceAnchors = getColumnSideAnchors(sourceColumnIndex, sourceStyle, sourceSize, scale)
  const targetAnchors = getColumnSideAnchors(targetColumnIndex, targetStyle, targetSize, scale)
  const sourceRect = getNodeRect(sourceStyle, sourceSize, scale)
  const targetRect = getNodeRect(targetStyle, targetSize, scale)
  const horizontalOverlap =
    Math.min(sourceRect.right, targetRect.right) - Math.max(sourceRect.left, targetRect.left)
  const minSharedWidth = Math.min(sourceRect.right - sourceRect.left, targetRect.right - targetRect.left)

  if (horizontalOverlap > minSharedWidth * 0.35) {
    const corridorTop = Math.min(sourceRect.top, targetRect.top) - ROUTE_CLEARANCE
    const corridorBottom = Math.max(sourceRect.bottom, targetRect.bottom) + ROUTE_CLEARANCE
    const leftBoundary = Math.min(sourceRect.left, targetRect.left)
    const rightBoundary = Math.max(sourceRect.right, targetRect.right)
    const leftCongestion = otherRects.filter(
      (rect) => rect.right <= leftBoundary && rect.bottom >= corridorTop && rect.top <= corridorBottom
    ).length
    const rightCongestion = otherRects.filter(
      (rect) => rect.left >= rightBoundary && rect.bottom >= corridorTop && rect.top <= corridorBottom
    ).length

    return leftCongestion <= rightCongestion
      ? { start: sourceAnchors.left, end: targetAnchors.left }
      : { start: sourceAnchors.right, end: targetAnchors.right }
  }

  const candidates = [
    { start: sourceAnchors.left, end: targetAnchors.left },
    { start: sourceAnchors.left, end: targetAnchors.right },
    { start: sourceAnchors.right, end: targetAnchors.left },
    { start: sourceAnchors.right, end: targetAnchors.right },
  ]

  return candidates.reduce((best, current) => {
    const bestDistance = Math.hypot(best.end.x - best.start.x, best.end.y - best.start.y)
    const currentDistance = Math.hypot(current.end.x - current.start.x, current.end.y - current.start.y)
    return currentDistance < bestDistance ? current : best
  })
}

function pickPreviewAnchor(
  columnIndex: number,
  style: { left: number; top: number },
  size: Size,
  scale: number,
  targetX: number,
  targetY: number
) {
  const anchors = getColumnSideAnchors(columnIndex, style, size, scale)
  const leftDistance = Math.hypot(targetX - anchors.left.x, targetY - anchors.left.y)
  const rightDistance = Math.hypot(targetX - anchors.right.x, targetY - anchors.right.y)
  return leftDistance < rightDistance ? anchors.left : anchors.right
}

function buildSmartPath(start: AnchorPoint, end: AnchorPoint, obstacles: Rect[]) {
  const startExit = {
    x: start.x + (start.side === "right" ? ROUTE_GAP : -ROUTE_GAP),
    y: start.y,
  }
  const endEntry = {
    x: end.x + (end.side === "right" ? ROUTE_GAP : -ROUTE_GAP),
    y: end.y,
  }
  const topLane =
    Math.min(start.y, end.y, ...obstacles.map((rect) => rect.top)) - ROUTE_GAP * 1.2
  const bottomLane =
    Math.max(start.y, end.y, ...obstacles.map((rect) => rect.bottom)) + ROUTE_GAP * 1.2
  const leftLane =
    Math.min(start.x, end.x, ...obstacles.map((rect) => rect.left)) - ROUTE_GAP * 1.4
  const rightLane =
    Math.max(start.x, end.x, ...obstacles.map((rect) => rect.right)) + ROUTE_GAP * 1.4
  const middleLane = (startExit.x + endEntry.x) / 2

  const candidates = [
    [start, startExit, { x: middleLane, y: start.y }, { x: middleLane, y: end.y }, endEntry, end],
    [
      start,
      startExit,
      { x: startExit.x, y: topLane },
      { x: endEntry.x, y: topLane },
      { x: endEntry.x, y: end.y },
      endEntry,
      end,
    ],
    [
      start,
      startExit,
      { x: startExit.x, y: bottomLane },
      { x: endEntry.x, y: bottomLane },
      { x: endEntry.x, y: end.y },
      endEntry,
      end,
    ],
    [
      start,
      startExit,
      { x: leftLane, y: start.y },
      { x: leftLane, y: end.y },
      { x: endEntry.x, y: end.y },
      endEntry,
      end,
    ],
    [
      start,
      startExit,
      { x: rightLane, y: start.y },
      { x: rightLane, y: end.y },
      { x: endEntry.x, y: end.y },
      endEntry,
      end,
    ],
  ].map((points) => compactPoints(points))

  const clearCandidates = candidates.filter((points) => candidateIsClear(points, obstacles))
  const best = (clearCandidates.length > 0 ? clearCandidates : candidates).reduce((shortest, current) =>
    polylineLength(current) < polylineLength(shortest) ? current : shortest
  )

  return pointsToPath(best)
}

export function TableEdgesOverlay({
  nodes,
  tableEdges,
  connectionDrag,
  getNodeStyle,
  getEffectiveNodeSize,
  getNodeScale,
}: Props) {
  const scale = getNodeScale()
  const tableNodes = nodes.filter((node) => node.type === "square-table")
  const nodeById = new Map(tableNodes.map((node) => [node.id, node]))
  const allNodeRects = nodes.map((node) => ({
    nodeId: node.id,
    rect: getNodeRect(getNodeStyle(node), getEffectiveNodeSize(node), scale),
  }))
  const paths: Array<{ d: string; preview?: boolean }> = []

  if (connectionDrag) {
    const sourceNode = nodeById.get(connectionDrag.sourceNodeId)
    if (sourceNode) {
      const start = pickPreviewAnchor(
        connectionDrag.sourceColumnIndex,
        getNodeStyle(sourceNode),
        getEffectiveNodeSize(sourceNode),
        scale,
        connectionDrag.endX,
        connectionDrag.endY
      )
      paths.push({
        d: buildSmartPath(
          start,
          {
            x: connectionDrag.endX,
            y: connectionDrag.endY,
            side: connectionDrag.endX >= start.x ? "left" : "right",
          },
          allNodeRects.filter(({ nodeId }) => nodeId !== sourceNode.id).map(({ rect }) => rect)
        ),
        preview: true,
      })
    }
  }

  for (const edge of tableEdges) {
    const sourceNode = nodeById.get(edge.sourceNodeId)
    const targetNode = nodeById.get(edge.targetNodeId)
    if (!sourceNode || !targetNode) continue

    const sourceColCount = sourceNode.tableColumns?.length ?? 0
    const targetColCount = targetNode.tableColumns?.length ?? 0
    if (
      edge.sourceColumnIndex < 0 ||
      edge.sourceColumnIndex >= sourceColCount ||
      edge.targetColumnIndex < 0 ||
      edge.targetColumnIndex >= targetColCount
    ) {
      continue
    }

    const { start, end } = pickBestAnchorPair(
      edge.sourceColumnIndex,
      getNodeStyle(sourceNode),
      getEffectiveNodeSize(sourceNode),
      edge.targetColumnIndex,
      getNodeStyle(targetNode),
      getEffectiveNodeSize(targetNode),
      scale,
      allNodeRects
        .filter(({ nodeId }) => nodeId !== sourceNode.id && nodeId !== targetNode.id)
        .map(({ rect }) => rect)
    )

    paths.push({
      d: buildSmartPath(
        start,
        end,
        allNodeRects
          .filter(({ nodeId }) => nodeId !== sourceNode.id && nodeId !== targetNode.id)
          .map(({ rect }) => rect)
      ),
    })
  }

  return (
    <svg className="pointer-events-none absolute inset-0 z-[8] overflow-visible" aria-hidden>
      <defs>
        <marker
          id="table-edge-arrow"
          markerWidth="12"
          markerHeight="10"
          refX="11"
          refY="5"
          orient="auto"
          markerUnits="userSpaceOnUse"
          overflow="visible"
        >
          <path d="M0,0 L11,5 L0,10 z" fill="rgb(14 165 233)" shapeRendering="geometricPrecision" />
        </marker>
        <marker
          id="table-edge-arrow-preview"
          markerWidth="12"
          markerHeight="10"
          refX="11"
          refY="5"
          orient="auto"
          markerUnits="userSpaceOnUse"
          overflow="visible"
        >
          <path d="M0,0 L11,5 L0,10 z" fill="rgb(56 189 248)" shapeRendering="geometricPrecision" />
        </marker>
      </defs>
      {paths.map((path, index) => (
        <path
          key={index}
          d={path.d}
          stroke={path.preview ? "rgb(56 189 248)" : "rgb(14 165 233)"}
          strokeWidth={path.preview ? 2.5 : 2}
          strokeDasharray={path.preview ? "8 5" : undefined}
          strokeOpacity={path.preview ? 0.95 : 0.9}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd={path.preview ? "url(#table-edge-arrow-preview)" : "url(#table-edge-arrow)"}
        />
      ))}
    </svg>
  )
}
