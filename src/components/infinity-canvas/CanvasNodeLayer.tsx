import type { CanvasNode } from "./types"
import type { EditingField } from "./types"
import { NodeCard } from "./NodeCard"

type Props = {
  nodes: CanvasNode[]
  selectedNodeIds: string[]
  getNodeStyle: (node: CanvasNode) => React.CSSProperties
  getNodeSurfaceStyle: (node: CanvasNode) => React.CSSProperties
  setNodeContentElement: (nodeId: string, element: HTMLElement | null) => void
  setTableWrapperElement: (nodeId: string, element: HTMLElement | null) => void
  editingField: EditingField | null
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

export function CanvasNodeLayer({
  nodes,
  selectedNodeIds,
  getNodeStyle,
  getNodeSurfaceStyle,
  setNodeContentElement,
  setTableWrapperElement,
  editingField,
  editingValue,
  setEditingField,
  setEditingValue,
  updateNode,
  syncNodeContentMinSize,
  onNodePointerDown,
  onNodePointerUp,
  onResizePointerDown,
  onSelectNode,
}: Props) {
  const isEditingField = (field: EditingField) =>
    JSON.stringify(editingField) === JSON.stringify(field)

  return (
    <div className="pointer-events-none absolute inset-0 z-[5]">
      {nodes.map((node) => (
        <NodeCard
          key={node.id}
          node={node}
          isSelected={selectedNodeIds.includes(node.id)}
          getNodeStyle={getNodeStyle}
          getNodeSurfaceStyle={getNodeSurfaceStyle}
          setNodeContentElement={setNodeContentElement}
          setTableWrapperElement={setTableWrapperElement}
          isEditingField={isEditingField}
          editingValue={editingValue}
          setEditingField={setEditingField}
          setEditingValue={setEditingValue}
          updateNode={updateNode}
          syncNodeContentMinSize={syncNodeContentMinSize}
          onNodePointerDown={onNodePointerDown}
          onNodePointerUp={onNodePointerUp}
          onResizePointerDown={onResizePointerDown}
          onSelectNode={onSelectNode}
        />
      ))}
    </div>
  )
}
