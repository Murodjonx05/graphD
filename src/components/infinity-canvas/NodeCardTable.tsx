import { useState } from "react"
import { cn } from "@/lib/utils"
import type { CanvasNode, TableEdge } from "./types"
import type { ColumnTypeOption, EditingField, SqliteType } from "./types"
import {
  COLUMN_TYPE_OPTIONS,
  TABLE_COLUMN_MIN_WIDTH,
  TABLE_LIST_ITEM_HEIGHT,
} from "./types"
import {
  columnDefToOption,
  coerceColumnValues,
  getTableColumnDefs,
  optionToDef,
} from "./node-utils"
import { EditableText } from "./EditableText"

type Props = {
  node: CanvasNode
  style: React.CSSProperties
  tableEdges: TableEdge[]
  onConnectionDragStart: (
    nodeId: string,
    columnIndex: number,
    clientX: number,
    clientY: number,
    pointerId: number
  ) => void
  setNodeContentElement: (nodeId: string, element: HTMLElement | null) => void
  setTableWrapperElement: (nodeId: string, element: HTMLElement | null) => void
  isEditingField: (field: EditingField) => boolean
  editingValue: string
  setEditingField: (field: EditingField | null) => void
  setEditingValue: (value: string) => void
  updateNode: (nodeId: string, updater: (node: CanvasNode) => CanvasNode) => void
  syncNodeContentMinSize: (nodeId: string) => void
}

export function NodeCardTable({
  node,
  style,
  tableEdges,
  onConnectionDragStart,
  setNodeContentElement,
  setTableWrapperElement,
  isEditingField,
  editingValue,
  setEditingField,
  setEditingValue,
  updateNode,
  syncNodeContentMinSize,
}: Props) {
  const [hoveredColumnIndex, setHoveredColumnIndex] = useState<number | null>(null)
  const columnDefs = getTableColumnDefs(node)
  const getCompactTypeLabel = (option: ColumnTypeOption) => {
    if (option.startsWith("PRIMARYKEY_")) {
      const type = option.replace("PRIMARYKEY_", "")
      return `PK ${type}`
    }
    return option
  }

  const columnHasEdge = (colIdx: number) =>
    tableEdges.some(
      (edge) =>
        (edge.sourceNodeId === node.id && edge.sourceColumnIndex === colIdx) ||
        (edge.targetNodeId === node.id && edge.targetColumnIndex === colIdx)
    )

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
      className="cursor-move rounded-xl border border-border/80 bg-card/95 p-0 shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur select-none"
      style={style}
      ref={(el) => setNodeContentElement(node.id, el)}
      data-node-content-id={node.id}
    >
      <div className="border-b border-border/70 px-4 py-3">
        <EditableText
          node={node}
          value={node.title}
          field={{ kind: "title", nodeId: node.id }}
          className="text-left font-mono text-[13px] font-semibold uppercase tracking-[0.12em] text-foreground"
          isEditing={isEditingField({ kind: "title", nodeId: node.id })}
          editingValue={editingValue}
          onEditingValueChange={setEditingValue}
          onEditingFieldClear={clearEditing}
          onUpdateNode={updateNode}
          onSyncNodeContentMinSize={syncNodeContentMinSize}
          onStartEditing={onStartEditing}
        />
      </div>

      <div
        className="w-full min-w-0"
        ref={(el) => setTableWrapperElement(node.id, el)}
        data-table-wrapper-id={node.id}
      >
        {columnDefs.map((def, columnIndex) => {
          const currentOption = columnDefToOption(def)
          const hasPkElsewhere = columnDefs.some((d, i) => i !== columnIndex && d.primaryKey)
          const options = hasPkElsewhere
            ? COLUMN_TYPE_OPTIONS.filter((option) => !option.value.startsWith("PRIMARYKEY_"))
            : COLUMN_TYPE_OPTIONS
          const isHovered = hoveredColumnIndex === columnIndex
          const isPk = def.primaryKey

          return (
            <div
              key={`${node.id}-column-${columnIndex}`}
              className={cn(
                "grid grid-cols-[28px_14px_minmax(0,1fr)_auto_28px] items-center gap-2 border-b border-border/50 px-4 py-2.5 transition-colors",
                isHovered && "bg-muted/35"
              )}
              style={{ minHeight: TABLE_LIST_ITEM_HEIGHT, minWidth: TABLE_COLUMN_MIN_WIDTH }}
              onMouseEnter={() => setHoveredColumnIndex(columnIndex)}
              onMouseLeave={() => setHoveredColumnIndex(null)}
            >
              <button
                type="button"
                aria-label="Drag to another column to connect"
                title={
                  columnHasEdge(columnIndex)
                    ? "Drag to another column to add link"
                    : "Drag to another column to connect"
                }
                onPointerDown={(event) => {
                  event.stopPropagation()
                  event.preventDefault()
                  onConnectionDragStart(
                    node.id,
                    columnIndex,
                    event.clientX,
                    event.clientY,
                    event.pointerId
                  )
                }}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center justify-self-start rounded-full border cursor-crosshair touch-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  columnHasEdge(columnIndex)
                    ? "border-sky-400 bg-sky-500/25 text-sky-400 hover:bg-sky-500/35 hover:border-sky-300"
                    : "border-sky-500/60 bg-card text-sky-500 hover:bg-sky-500/10 hover:text-sky-400",
                  isHovered && "scale-105 shadow-[0_0_0_3px_rgba(14,165,233,0.2)]"
                )}
              >
                <div
                  className={cn(
                    "rounded-full bg-current",
                    columnHasEdge(columnIndex) ? "h-2.5 w-2.5" : "h-2 w-2"
                  )}
                />
              </button>

              <div className="flex h-4 w-4 items-center justify-center text-[10px] text-muted-foreground">
                {isPk ? "◆" : "○"}
              </div>

              <div className="min-w-0 flex-1 pr-1">
                <EditableText
                  node={node}
                  value={node.tableColumns[columnIndex] ?? def.name}
                  field={{ kind: "table-column", nodeId: node.id, columnIndex }}
                  className="block text-left font-mono text-[14px] font-medium text-foreground/95"
                  isEditing={isEditingField({ kind: "table-column", nodeId: node.id, columnIndex })}
                  editingValue={editingValue}
                  onEditingValueChange={setEditingValue}
                  onEditingFieldClear={clearEditing}
                  onUpdateNode={updateNode}
                  onSyncNodeContentMinSize={syncNodeContentMinSize}
                  onStartEditing={onStartEditing}
                />
              </div>

              <select
                value={currentOption}
                aria-label={`Type for ${def.name}`}
                onPointerDown={(event) => event.stopPropagation()}
                onChange={(event) => {
                  const option = event.target.value as ColumnTypeOption
                  const { type, primaryKey } = optionToDef(option)

                  updateNode(node.id, (current) => {
                    const defs = getTableColumnDefs(current)
                    const nextDefs = defs.map((currentDef, index) => {
                      if (index !== columnIndex) {
                        return primaryKey ? { ...currentDef, primaryKey: false } : currentDef
                      }

                      return {
                        ...currentDef,
                        type,
                        primaryKey,
                        ...(primaryKey ? { name: "id" } : {}),
                      }
                    })

                    const nextColumns = current.tableColumns.map((column, index) =>
                      index === columnIndex && nextDefs[index]?.primaryKey ? "id" : column
                    )
                    const columnValues = current.tableRows.map((row) => row[columnIndex] ?? "")
                    const coerced = coerceColumnValues(type, columnValues)
                    const nextRows = current.tableRows.map((row, rowIndex) =>
                      row.map((cell, colIdx) => (colIdx === columnIndex ? coerced[rowIndex] : cell))
                    )

                    return {
                      ...current,
                      tableColumns: nextColumns,
                      tableColumnDefs: nextDefs,
                      tableRows: nextRows,
                    }
                  })
                }}
                className="h-6 min-w-[66px] max-w-[78px] cursor-pointer appearance-none rounded-md border border-border/60 bg-background/60 px-1.5 text-right font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                title="Column type"
              >
                <option value={currentOption} className="bg-background text-foreground">
                  {getCompactTypeLabel(currentOption)}
                </option>
                {options
                  .filter((option) => option.value !== currentOption)
                  .map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="bg-background text-foreground"
                    >
                      {option.label}
                    </option>
                  ))}
              </select>

              <button
                type="button"
                aria-label="Drag to another column to connect"
                title={
                  columnHasEdge(columnIndex)
                    ? "Drag to another column to add link"
                    : "Drag to another column to connect"
                }
                onPointerDown={(event) => {
                  event.stopPropagation()
                  event.preventDefault()
                  onConnectionDragStart(
                    node.id,
                    columnIndex,
                    event.clientX,
                    event.clientY,
                    event.pointerId
                  )
                }}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center justify-self-end rounded-full border cursor-crosshair touch-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  columnHasEdge(columnIndex)
                    ? "border-sky-400 bg-sky-500/25 text-sky-400 hover:bg-sky-500/35 hover:border-sky-300"
                    : "border-sky-500/60 bg-card text-sky-500 hover:bg-sky-500/10 hover:text-sky-400",
                  isHovered && "scale-105 shadow-[0_0_0_3px_rgba(14,165,233,0.2)]"
                )}
              >
                <div
                  className={cn(
                    "rounded-full bg-current",
                    columnHasEdge(columnIndex) ? "h-2.5 w-2.5" : "h-2 w-2"
                  )}
                />
              </button>
            </div>
          )
        })}

        <button
          type="button"
          aria-label="Add column"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            updateNode(node.id, (current) => {
              const defs = getTableColumnDefs(current)
              const newName = `col ${current.tableColumns.length + 1}`

              return {
                ...current,
                tableColumns: [...current.tableColumns, newName],
                tableRows: current.tableRows.map((row) => [...row, ""]),
                tableColumnDefs: [
                  ...defs,
                  {
                    name: newName,
                    type: "TEXT" as SqliteType,
                    primaryKey: false,
                    width: TABLE_COLUMN_MIN_WIDTH,
                  },
                ],
              }
            })
          }}
          className="flex h-11 w-full items-center justify-center border-t border-dashed border-border/60 bg-transparent font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          + column
        </button>
      </div>
    </div>
  )
}
