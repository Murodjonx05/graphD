import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CanvasNode } from "./types"
import type { ColumnTypeOption, EditingField, SqliteType } from "./types"
import { COLUMN_TYPE_OPTIONS, TABLE_ADD_COLUMN_CELL_WIDTH, TABLE_COLUMN_MIN_WIDTH } from "./types"
import {
  columnDefToOption,
  getTableColumnDefs,
  optionToDef,
} from "./node-utils"
import { EditableText } from "./EditableText"

type Props = {
  node: CanvasNode
  style: React.CSSProperties
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
  setNodeContentElement,
  setTableWrapperElement,
  isEditingField,
  editingValue,
  setEditingField,
  setEditingValue,
  updateNode,
  syncNodeContentMinSize,
}: Props) {
  const columnDefs = getTableColumnDefs(node)
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
      <div className="mb-3 border-b border-border/40 pb-2">
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
      </div>
      <div
        className="w-full min-w-0 rounded-lg border border-border bg-card overflow-hidden [&_.relative]:!overflow-hidden [&_.relative]:min-w-0"
        ref={(el) => setTableWrapperElement(node.id, el)}
        data-table-wrapper-id={node.id}
      >
        <Table className="w-full min-w-full table-fixed" style={{ tableLayout: "fixed" }}>
          <colgroup>
            {columnDefs.map((d, i) => {
              const isLast = i === columnDefs.length - 1
              const width = d.width ?? TABLE_COLUMN_MIN_WIDTH
              return (
                <col
                  key={i}
                  style={
                    isLast
                      ? { minWidth: width }
                      : { width: width, minWidth: width }
                  }
                />
              )
            })}
            <col style={{ width: TABLE_ADD_COLUMN_CELL_WIDTH, minWidth: TABLE_ADD_COLUMN_CELL_WIDTH }} />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columnDefs.map((def, columnIndex) => {
                const currentOption = columnDefToOption(def)
                const hasPkElsewhere = columnDefs.some((d, i) => i !== columnIndex && d.primaryKey)
                const options = hasPkElsewhere
                  ? COLUMN_TYPE_OPTIONS.filter((o) => !o.value.startsWith("PRIMARYKEY_"))
                  : COLUMN_TYPE_OPTIONS
                const currentLabel =
                  COLUMN_TYPE_OPTIONS.find((o) => o.value === currentOption)?.label ?? def.type
                const isPk = def.primaryKey
                return (
                  <TableHead
                    key={`${node.id}-column-${columnIndex}`}
                    className="align-top whitespace-nowrap py-3"
                  >
                    <div className="flex flex-col gap-1.5">
                      <Badge
                        variant={isPk ? "primary-key" : "muted"}
                        className="w-fit cursor-pointer px-2 py-0.5 has-[select]:p-0 has-[select]:py-0.5 [&_select]:min-h-0 [&_select]:border-0 [&_select]:bg-transparent [&_select]:py-0.5 [&_select]:pl-2 [&_select]:pr-2 [&_select]:text-[10px] [&_select]:outline-none [&_select]:focus:ring-0 [&_select]:cursor-pointer"
                      >
                        <select
                          value={currentOption}
                          aria-label={`Type for ${def.name}`}
                          onPointerDown={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const option = e.target.value as ColumnTypeOption
                            const { type, primaryKey } = optionToDef(option)
                            updateNode(node.id, (current) => {
                              const defs = getTableColumnDefs(current)
                              const nextDefs = defs.map((d, i) => {
                                if (i !== columnIndex) {
                                  return primaryKey ? { ...d, primaryKey: false } : d
                                }
                                return {
                                  ...d,
                                  type,
                                  primaryKey,
                                  ...(primaryKey ? { name: "id" } : {}),
                                }
                              })
                              const nextColumns = current.tableColumns.map((col, i) =>
                                i === columnIndex && nextDefs[i]?.primaryKey ? "id" : col
                              )
                              return {
                                ...current,
                                tableColumns: nextColumns,
                                tableColumnDefs: nextDefs,
                              }
                            })
                          }}
                          className="cursor-pointer appearance-none bg-transparent [background-image:none]"
                          title="Column type"
                        >
                          <option value={currentOption} className="bg-background text-foreground">
                            {currentLabel}
                          </option>
                          {options
                            .filter((o) => o.value !== currentOption)
                            .map((o) => (
                              <option key={o.value} value={o.value} className="bg-background text-foreground">
                                {o.label}
                              </option>
                            ))}
                        </select>
                      </Badge>
                      <span className="min-w-0 truncate">
                        <EditableText
                          node={node}
                          value={node.tableColumns[columnIndex] ?? def.name}
                          field={{ kind: "table-column", nodeId: node.id, columnIndex }}
                          className="block text-left text-[11px] font-medium tracking-wide text-foreground/90"
                          displayValue={
                            (node.tableColumns[columnIndex] ?? def.name).toLowerCase() === "value"
                              ? "Val.."
                              : undefined
                          }
                          isEditing={isEditingField({ kind: "table-column", nodeId: node.id, columnIndex })}
                          editingValue={editingValue}
                          onEditingValueChange={setEditingValue}
                          onEditingFieldClear={clearEditing}
                          onUpdateNode={updateNode}
                          onSyncNodeContentMinSize={syncNodeContentMinSize}
                          onStartEditing={onStartEditing}
                        />
                      </span>
                    </div>
                  </TableHead>
                )
              })}
              <TableHead
                className="border-l border-border/40 align-top py-3"
                style={{ width: TABLE_ADD_COLUMN_CELL_WIDTH, minWidth: TABLE_ADD_COLUMN_CELL_WIDTH }}
              >
                <button
                  type="button"
                  aria-label="Add column"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    updateNode(node.id, (current) => {
                      const defs = getTableColumnDefs(current)
                      const newName = `col ${current.tableColumns.length + 1}`
                      return {
                        ...current,
                        tableColumns: [...current.tableColumns, newName],
                        tableRows: current.tableRows.map((row) => [...row, "new cell"]),
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
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  +
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {node.tableRows.map((row, rowIndex) => (
              <TableRow key={`${node.id}-row-${rowIndex}`}>
                {row.map((cell, columnIndex) => (
                  <TableCell
                    key={`${node.id}-cell-${rowIndex}-${columnIndex}`}
                    className={cn("py-2.5", rowIndex % 2 === 1 && "bg-muted/30")}
                    title={cell}
                  >
                    <EditableText
                      node={node}
                      value={cell}
                      field={{ kind: "table-cell", nodeId: node.id, rowIndex, columnIndex }}
                      className="block w-full min-w-0 truncate text-left text-sm leading-snug text-foreground"
                      isEditing={isEditingField({
                        kind: "table-cell",
                        nodeId: node.id,
                        rowIndex,
                        columnIndex,
                      })}
                      editingValue={editingValue}
                      onEditingValueChange={setEditingValue}
                      onEditingFieldClear={clearEditing}
                      onUpdateNode={updateNode}
                      onSyncNodeContentMinSize={syncNodeContentMinSize}
                      onStartEditing={onStartEditing}
                    />
                  </TableCell>
                ))}
                <TableCell
                className="border-l border-border/40 py-2.5"
                style={{ width: TABLE_ADD_COLUMN_CELL_WIDTH, minWidth: TABLE_ADD_COLUMN_CELL_WIDTH }}
              />
              </TableRow>
            ))}
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columnDefs.length + 1}
                className="border-t border-border/40 py-2 align-middle"
              >
                <button
                  type="button"
                  aria-label="Add row"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    updateNode(node.id, (current) => ({
                      ...current,
                      tableRows: [
                        ...current.tableRows,
                        current.tableColumns.map(() => "new value"),
                      ],
                    }))
                  }}
                  className="rounded-md border border-dashed border-border/70 bg-transparent px-3 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  + row
                </button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
