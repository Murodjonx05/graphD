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

export function NodeCardTitleBody({
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
  const clearEditing = () => {
    setEditingField(null)
    setEditingValue("")
  }
  return (
    <div
      className="flex cursor-move flex-col gap-2 rounded-2xl border border-border/80 p-4 shadow-lg backdrop-blur select-none"
      style={style}
      ref={(el) => setNodeContentElement(node.id, el)}
      data-node-content-id={node.id}
    >
      <EditableText
        node={node}
        value={node.title}
        field={{ kind: "title", nodeId: node.id }}
        className="mb-2 text-left text-sm font-semibold text-foreground"
        isEditing={isEditingField({ kind: "title", nodeId: node.id })}
        editingValue={editingValue}
        onEditingValueChange={setEditingValue}
        onEditingFieldClear={clearEditing}
        onUpdateNode={updateNode}
        onSyncNodeContentMinSize={syncNodeContentMinSize}
        onStartEditing={(field, value) => {
          setEditingField(field)
          setEditingValue(value)
        }}
      />
      <EditableText
        node={node}
        value={node.body}
        field={{ kind: "body", nodeId: node.id }}
        className="text-left text-sm text-muted-foreground"
        isEditing={isEditingField({ kind: "body", nodeId: node.id })}
        editingValue={editingValue}
        onEditingValueChange={setEditingValue}
        onEditingFieldClear={clearEditing}
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
