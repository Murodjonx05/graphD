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

export function NodeCardListColumn({
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
  const onStartEditing = (field: EditingField, value: string) => {
    setEditingField(field)
    setEditingValue(value)
  }
  return (
    <div
      className="cursor-move rounded-2xl border border-border/80 p-4 shadow-lg backdrop-blur select-none"
      style={style}
      ref={(el) => setNodeContentElement(node.id, el)}
      data-node-content-id={node.id}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <EditableText
          node={node}
          value={node.title}
          field={{ kind: "title", nodeId: node.id }}
          className="text-left text-sm font-semibold text-foreground"
          isEditing={isEditingField({ kind: "title", nodeId: node.id })}
          editingValue={editingValue}
          onEditingValueChange={setEditingValue}
          onEditingFieldClear={clearEditing}
          onUpdateNode={updateNode}
          onSyncNodeContentMinSize={syncNodeContentMinSize}
          onStartEditing={onStartEditing}
        />
        <button
          type="button"
          aria-label="Add list item"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            updateNode(node.id, (current) => ({
              ...current,
              tableRows: [...current.tableRows, ["new item"]],
            }))
          }}
          className="rounded-md border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              <EditableText
                node={node}
                value={row[0] ?? ""}
                field={{ kind: "table-cell", nodeId: node.id, rowIndex, columnIndex: 0 }}
                className="w-full text-left text-sm text-muted-foreground"
                isEditing={isEditingField({ kind: "table-cell", nodeId: node.id, rowIndex, columnIndex: 0 })}
                editingValue={editingValue}
                onEditingValueChange={setEditingValue}
                onEditingFieldClear={clearEditing}
                onUpdateNode={updateNode}
                onSyncNodeContentMinSize={syncNodeContentMinSize}
                onStartEditing={onStartEditing}
              />
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                aria-label="Move row up"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  if (rowIndex === 0) return
                  updateNode(node.id, (current) => {
                    const nextRows = [...current.tableRows]
                    const previousRow = nextRows[rowIndex - 1]
                    nextRows[rowIndex - 1] = nextRows[rowIndex]
                    nextRows[rowIndex] = previousRow
                    return { ...current, tableRows: nextRows }
                  })
                }}
                className="rounded-md border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={rowIndex === 0}
              >
                up
              </button>
              <button
                type="button"
                aria-label="Move row down"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  if (rowIndex === node.tableRows.length - 1) return
                  updateNode(node.id, (current) => {
                    const nextRows = [...current.tableRows]
                    const nextRow = nextRows[rowIndex + 1]
                    nextRows[rowIndex + 1] = nextRows[rowIndex]
                    nextRows[rowIndex] = nextRow
                    return { ...current, tableRows: nextRows }
                  })
                }}
                className="rounded-md border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={rowIndex === node.tableRows.length - 1}
              >
                down
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
