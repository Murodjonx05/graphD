import type { CanvasNode, EditingField } from "./types"
import { getTableColumnDefs } from "./node-utils"

export function getNodeTextStyleForField(node: CanvasNode, field: EditingField): React.CSSProperties {
  const isTitle = field.kind === "title"
  const color = isTitle ? (node.titleTextColor ?? node.textColor) : (node.bodyTextColor ?? node.textColor)
  const fontSize = isTitle ? (node.titleTextSize ?? node.textSize) : (node.bodyTextSize ?? node.textSize)
  const fontWeight = isTitle ? (node.titleTextWeight ?? node.textWeight) : (node.bodyTextWeight ?? node.textWeight)
  return { color, fontSize: `${fontSize}px`, fontWeight, opacity: node.opacity }
}

export function getEditableFieldAriaLabel(f: EditingField): string {
  switch (f.kind) {
    case "title":
      return "Edit title"
    case "body":
      return "Edit body"
    case "table-column":
      return `Edit column ${f.columnIndex + 1}`
    case "table-cell":
      return `Edit cell row ${f.rowIndex + 1} column ${f.columnIndex + 1}`
  }
}

type EditableTextProps = {
  node: CanvasNode
  value: string
  field: EditingField
  className: string
  displayValue?: string
  isEditing: boolean
  editingValue: string
  onEditingValueChange: (value: string) => void
  onEditingFieldClear: () => void
  onUpdateNode: (nodeId: string, updater: (node: CanvasNode) => CanvasNode) => void
  onSyncNodeContentMinSize: (nodeId: string) => void
  onStartEditing: (field: EditingField, value: string) => void
}

export function EditableText({
  node,
  value,
  field,
  className,
  displayValue,
  isEditing,
  editingValue,
  onEditingValueChange,
  onEditingFieldClear,
  onUpdateNode,
  onSyncNodeContentMinSize,
  onStartEditing,
}: EditableTextProps) {
  const shown = displayValue !== undefined ? displayValue : value
  const textStyle = getNodeTextStyleForField(node, field)

  if (isEditing) {
    const resizeEditor = (element: HTMLTextAreaElement) => {
      element.style.height = "0px"
      element.style.height = `${element.scrollHeight}px`
    }
    const updateFieldValue = (nextValue: string) => {
      onEditingValueChange(nextValue)
      onUpdateNode(node.id, (current) => {
        if (field.kind === "title") return { ...current, title: nextValue }
        if (field.kind === "body") return { ...current, body: nextValue }
        if (field.kind === "table-column") {
          const defs = getTableColumnDefs(current)
          const nextDefs = defs.map((d, i) => (i === field.columnIndex ? { ...d, name: nextValue } : d))
          return {
            ...current,
            tableColumns: current.tableColumns.map((col, index) => (index === field.columnIndex ? nextValue : col)),
            tableColumnDefs: nextDefs,
          }
        }
        if (field.kind === "table-cell") {
          return {
            ...current,
            tableRows: current.tableRows.map((row, rowIndex) =>
              rowIndex === field.rowIndex
                ? row.map((cell, columnIndex) => (columnIndex === field.columnIndex ? nextValue : cell))
                : row
            ),
          }
        }
        return current
      })
    }
    return (
      <textarea
        autoFocus
        rows={1}
        wrap="soft"
        spellCheck={false}
        value={editingValue}
        aria-label={getEditableFieldAriaLabel(field)}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          updateFieldValue(e.target.value)
          resizeEditor(e.target)
        }}
        onBlur={() => {
          onEditingFieldClear()
          requestAnimationFrame(() => onSyncNodeContentMinSize(node.id))
        }}
        onKeyDown={(e) => {
          if (field.kind !== "body" && e.key === "Enter") {
            e.preventDefault()
            onEditingFieldClear()
          }
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault()
            onEditingFieldClear()
          }
        }}
        ref={(element) => {
          if (!element) return
          queueMicrotask(() => {
            resizeEditor(element)
            element.setSelectionRange(element.value.length, element.value.length)
          })
        }}
        className={`${className} block h-auto w-full min-w-0 max-w-full resize-none overflow-x-hidden overflow-y-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere] border-0 bg-transparent p-0 leading-[inherit] outline-none ring-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
        style={{ ...textStyle, boxSizing: "border-box", wordBreak: "break-all" }}
      />
    )
  }

  return (
    <button
      type="button"
      aria-label={getEditableFieldAriaLabel(field)}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onStartEditing(field, value)
      }}
      className={`${className} block w-full min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] select-none text-inherit`}
      style={{ ...textStyle, wordBreak: "break-all" }}
    >
      {shown}
    </button>
  )
}
