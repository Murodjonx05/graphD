import type {
  CardType,
  CanvasNode,
  ColumnTypeOption,
  TableColumnDef,
  Size,
  SqliteType,
} from "./types"

/** Coerce a single cell value to the given SQLite type (e.g. after column type change). */
export function coerceValueToType(type: SqliteType, value: string): string {
  const trimmed = value.trim()
  switch (type) {
    case "INTEGER": {
      const n = Number(trimmed)
      if (trimmed === "" || Number.isNaN(n)) return ""
      return String(Math.floor(n))
    }
    case "REAL": {
      const n = Number(trimmed)
      if (trimmed === "" || Number.isNaN(n)) return ""
      return String(n)
    }
    case "TEXT":
      return value
    case "BLOB":
      return value
    default:
      return value
  }
}

/** Coerce an array of cell values (one column) to the given type. */
export function coerceColumnValues(type: SqliteType, values: string[]): string[] {
  return values.map((v) => coerceValueToType(type, v))
}
import type { Point } from "./types"
import {
  TABLE_ADD_COLUMN_CELL_WIDTH,
  TABLE_CARD_PADDING_X,
  TABLE_COLUMN_MIN_WIDTH,
  TABLE_LIST_ITEM_HEIGHT,
  TABLE_WRAPPER_OFFSET_Y,
} from "./types"

export function columnDefToOption(def: TableColumnDef): ColumnTypeOption {
  return def.primaryKey ? (`PRIMARYKEY_${def.type}` as ColumnTypeOption) : def.type
}

export function optionToDef(option: ColumnTypeOption): Pick<TableColumnDef, "type" | "primaryKey"> {
  if (option.startsWith("PRIMARYKEY_")) {
    const type = option.replace("PRIMARYKEY_", "") as SqliteType
    return { type, primaryKey: true }
  }
  return { type: option as SqliteType, primaryKey: false }
}

export function getTableColumnDefs(node: CanvasNode): TableColumnDef[] {
  const names = node.tableColumns
  const defs = node.tableColumnDefs
  if (defs && defs.length === names.length) {
    return defs.map((d, i) => ({ ...d, name: names[i] ?? d.name }))
  }
  return names.map((name) => ({
    name,
    type: "TEXT" as SqliteType,
    primaryKey: false,
    width: TABLE_COLUMN_MIN_WIDTH,
  }))
}

export function getThemeNodeDefaults() {
  const styles = getComputedStyle(document.documentElement)
  const fg =
    styles.getPropertyValue("--card-foreground").trim() || "oklch(0.145 0 0)"
  return {
    backgroundColor: styles.getPropertyValue("--card").trim() || "oklch(1 0 0)",
    textColor: fg,
    opacity: 0.95,
    titleTextColor: fg,
    titleTextSize: 16,
    titleTextWeight: 600,
    bodyTextColor: fg,
    bodyTextSize: 14,
    bodyTextWeight: 500,
  }
}

export function createDefaultNode(type: CardType, x: number, y: number): CanvasNode {
  const themeDefaults = getThemeNodeDefaults()
  const base = {
    id: `${type}-${crypto.randomUUID()}`,
    type,
    x,
    y,
    title: "Title",
    body: "Body content",
    tableColumns: ["name", "body"],
    tableRows: [
      ["row 01", "item body"],
      ["row 02", "item body"],
      ["row 03", "item body"],
    ],
    backgroundColor: themeDefaults.backgroundColor,
    opacity: themeDefaults.opacity,
    textColor: themeDefaults.textColor,
    textSize: themeDefaults.bodyTextSize,
    textWeight: themeDefaults.bodyTextWeight,
    titleTextColor: themeDefaults.titleTextColor,
    titleTextSize: themeDefaults.titleTextSize,
    titleTextWeight: themeDefaults.titleTextWeight,
    bodyTextColor: themeDefaults.bodyTextColor,
    bodyTextSize: themeDefaults.bodyTextSize,
    bodyTextWeight: themeDefaults.bodyTextWeight,
  }

  switch (type) {
    case "square-body":
      return { ...base, width: 176, height: 96, autoSize: true }
    case "square-title-body":
      return { ...base, width: 192, height: 116, autoSize: true }
    case "square-table":
      return {
        ...base,
        width: 208,
        height: 158,
        autoSize: true,
        tableColumns: ["id", "body"],
        tableRows: [
          ["1", "item body"],
          ["2", "item body"],
          ["3", "item body"],
        ],
        tableColumnDefs: [
          { name: "id", type: "INTEGER", primaryKey: true, width: TABLE_COLUMN_MIN_WIDTH },
          { name: "body", type: "TEXT", primaryKey: false, width: TABLE_COLUMN_MIN_WIDTH },
        ],
      }
    case "square-list-column":
      return {
        ...base,
        width: 180,
        height: 188,
        autoSize: true,
        tableColumns: ["items"],
        tableRows: [["item 01"], ["item 02"], ["item 03"]],
      }
    case "circle-body":
      return { ...base, width: 144, height: 144, autoSize: true }
  }
}

export function getNodeBaseMinSize(type: CardType): Size {
  switch (type) {
    case "square-body":
      return { width: 140, height: 84 }
    case "square-title-body":
      return { width: 156, height: 104 }
    case "square-table":
      return { width: 180, height: 132 }
    case "square-list-column":
      return { width: 156, height: 132 }
    case "circle-body":
      return { width: 120, height: 120 }
  }
}

export function getNodeResolvedBaseMinSize(node: CanvasNode): Size {
  const baseMinSize = getNodeBaseMinSize(node.type)

  if (node.type !== "square-table") {
    return baseMinSize
  }

  const defs = getTableColumnDefs(node)
  const widestColumn = defs.reduce(
    (max, d) => Math.max(max, d.width ?? TABLE_COLUMN_MIN_WIDTH),
    TABLE_COLUMN_MIN_WIDTH
  )
  const listHeight = defs.length * TABLE_LIST_ITEM_HEIGHT + 24
  const tableWidth = Math.max(
    baseMinSize.width,
    widestColumn + TABLE_CARD_PADDING_X + TABLE_ADD_COLUMN_CELL_WIDTH + 48
  )

  return {
    width: tableWidth,
    height: Math.max(baseMinSize.height, listHeight),
  }
}

export function isFlexibleHeightCard(type: CardType) {
  return (
    type === "square-body" ||
    type === "square-title-body" ||
    type === "square-table" ||
    type === "square-list-column"
  )
}

export function isCircleLikeNode(node: CanvasNode) {
  return node.type === "circle-body"
}

/** Hit-test: find table and column index at a point (container coords). Used for connection drop target.
 * scale: card transform scale so hit area matches rendered bounds. */
export function getTableColumnAtPoint(
  nodes: CanvasNode[],
  point: Point,
  getNodeStyle: (node: CanvasNode) => { left: number; top: number },
  getEffectiveNodeSize: (node: CanvasNode) => Size,
  scale: number
): { nodeId: string; columnIndex: number } | null {
  const tableNodes = nodes.filter((n) => n.type === "square-table")
  for (const node of tableNodes) {
    const style = getNodeStyle(node)
    const size = getEffectiveNodeSize(node)
    const defs = getTableColumnDefs(node)
    const colCount = defs.length
    if (colCount === 0) continue
    const w = size.width * scale
    const h = size.height * scale
    const wrapperLeft = style.left - w / 2 + (TABLE_CARD_PADDING_X / 2) * scale
    const wrapperTop = style.top - h / 2 + TABLE_WRAPPER_OFFSET_Y * scale
    const itemHeight = TABLE_LIST_ITEM_HEIGHT * scale
    const listBottom = wrapperTop + defs.length * itemHeight
    const wrapperRight = style.left + w / 2 - (TABLE_CARD_PADDING_X / 2) * scale

    if (
      point.x < wrapperLeft ||
      point.x >= wrapperRight ||
      point.y < wrapperTop ||
      point.y >= listBottom
    ) {
      continue
    }

    const columnIndex = Math.floor((point.y - wrapperTop) / itemHeight)
    const clampedIndex = Math.max(0, Math.min(columnIndex, defs.length - 1))
    return { nodeId: node.id, columnIndex: clampedIndex }
  }
  return null
}
