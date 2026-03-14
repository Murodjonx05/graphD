import type { CanvasNode } from "./types"
import type { EditingField } from "./types"
import { NodeCardSquareBody } from "./NodeCardSquareBody"
import { NodeCardTitleBody } from "./NodeCardTitleBody"
import { NodeCardTable } from "./NodeCardTable"
import { NodeCardListColumn } from "./NodeCardListColumn"
import { NodeCardCircleBody } from "./NodeCardCircleBody"

type CommonProps = {
  node: CanvasNode
  isSelected: boolean
  getNodeStyle: (node: CanvasNode) => React.CSSProperties
  getNodeSurfaceStyle: (node: CanvasNode) => React.CSSProperties
  setNodeContentElement: (nodeId: string, element: HTMLElement | null) => void
  setTableWrapperElement?: (nodeId: string, element: HTMLElement | null) => void
  isEditingField: (field: EditingField) => boolean
  editingValue: string
  setEditingField: (field: EditingField | null) => void
  setEditingValue: (value: string) => void
  updateNode: (nodeId: string, updater: (node: CanvasNode) => CanvasNode) => void
  syncNodeContentMinSize: (nodeId: string) => void
  onNodePointerDown: (event: React.PointerEvent<HTMLDivElement>, node: CanvasNode) => void
  onNodePointerUp: (event: React.PointerEvent<HTMLDivElement>) => void
  onResizePointerDown: (event: React.PointerEvent<HTMLButtonElement>, node: CanvasNode) => void
  onSelectNode: (nodeId: string) => void
}

export function NodeCard({
  node,
  isSelected,
  getNodeStyle,
  getNodeSurfaceStyle,
  setNodeContentElement,
  setTableWrapperElement,
  isEditingField,
  editingValue,
  setEditingField,
  setEditingValue,
  updateNode,
  syncNodeContentMinSize,
  onNodePointerDown,
  onNodePointerUp,
  onResizePointerDown,
  onSelectNode,
}: CommonProps) {
  const style = getNodeStyle(node)
  const surfaceStyle = getNodeSurfaceStyle(node)
  const common = {
    node,
    style: surfaceStyle,
    setNodeContentElement,
    isEditingField,
    editingValue,
    setEditingField,
    setEditingValue,
    updateNode,
    syncNodeContentMinSize,
  }

  return (
    <div
      style={style}
      className="pointer-events-auto absolute"
      onPointerDown={(e) => onNodePointerDown(e, node)}
      onPointerUp={onNodePointerUp}
      onClick={(e) => {
        e.stopPropagation()
        onSelectNode(node.id)
      }}
    >
      {isSelected && (
        <div className="absolute inset-[-6px] rounded-[1.35rem] border-2 border-sky-500/80 bg-sky-500/5" />
      )}
      {node.type === "square-body" && <NodeCardSquareBody {...common} />}
      {node.type === "square-title-body" && <NodeCardTitleBody {...common} />}
      {node.type === "square-table" && (
        <NodeCardTable
          {...common}
          setTableWrapperElement={setTableWrapperElement ?? (() => {})}
        />
      )}
      {node.type === "square-list-column" && <NodeCardListColumn {...common} />}
      {node.type === "circle-body" && <NodeCardCircleBody {...common} />}
      {isSelected && (
        <button
          type="button"
          aria-label="Resize card"
          className="absolute -bottom-2 -right-2 z-10 h-4 w-4 cursor-se-resize rounded-sm border border-border bg-background shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onPointerDown={(e) => onResizePointerDown(e, node)}
        />
      )}
    </div>
  )
}
