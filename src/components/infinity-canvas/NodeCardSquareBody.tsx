import type { CanvasNode } from "./types"
import { EditableText } from "./EditableText"
import type { EditingField } from "./types"

type Props = {
  node: CanvasNode
  style: React.CSSProperties
  setNodeContentElement: (nodeId: string, element: HTMLElement | null) => void
  isEditingField: (field: EditingField) => boolean
  editingValue: string
  setEditingField: (field: EditingField | null) => void
  setEditingValue: (value: string) => void
  updateNode: (nodeId: string, updater: (node: CanvasNode) => CanvasNode) => void
  syncNodeContentMinSize: (nodeId: string) => void
}

export function NodeCardSquareBody({
  node,
  style,
  setNodeContentElement,
  isEditingField,
  editingValue,
  setEditingField,
  setEditingValue,
  updateNode,
  syncNodeContentMinSize,
}: Props) {
  return (
    <div
      className="cursor-move rounded-2xl border border-border/80 p-4 shadow-lg backdrop-blur select-none"
      style={style}
      ref={(el) => setNodeContentElement(node.id, el)}
      data-node-content-id={node.id}
    >
      <EditableText
        node={node}
        value={node.body}
        field={{ kind: "body", nodeId: node.id }}
        className="text-left text-sm text-foreground"
        isEditing={isEditingField({ kind: "body", nodeId: node.id })}
        editingValue={editingValue}
        onEditingValueChange={setEditingValue}
        onEditingFieldClear={() => {
          setEditingField(null)
          setEditingValue("")
        }}
        onUpdateNode={updateNode}
        onSyncNodeContentMinSize={syncNodeContentMinSize}
        onStartEditing={(field, value) => {
          setEditingField(field)
          setEditingValue(value)
        }}
      />
    </div>
  )
}
