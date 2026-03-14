export type Point = {
  x: number
  y: number
}

export type GridSettings = {
  type: "square" | "rounded" | "web"
  color: string
  distance: number
  steps: number
  opacity: number
  thickness: number
}

export type CardType =
  | "square-body"
  | "square-title-body"
  | "square-table"
  | "square-list-column"
  | "circle-body"

export type SqliteType = "INTEGER" | "TEXT" | "REAL" | "BLOB"

export type TableColumnDef = {
  name: string
  type: SqliteType
  primaryKey?: boolean
  width?: number
}

/** Connection between two table cards by column headers (col_heads). */
export type TableEdge = {
  id: string
  sourceNodeId: string
  sourceColumnIndex: number
  targetNodeId: string
  targetColumnIndex: number
}

/** Dragging a new connection from a column; endX/endY follow the pointer. */
export type ConnectionDrag = {
  sourceNodeId: string
  sourceColumnIndex: number
  endX: number
  endY: number
}

export type CanvasNode = {
  id: string
  type: CardType
  x: number
  y: number
  title: string
  body: string
  tableColumns: string[]
  tableRows: string[][]
  /** Per-column type/primaryKey/width; when missing, derived from tableColumns */
  tableColumnDefs?: TableColumnDef[]
  backgroundColor: string
  opacity: number
  textColor: string
  textSize: number
  textWeight: number
  /** Title text (for cards with title+body). Fallback: textColor/textSize/textWeight */
  titleTextColor?: string
  titleTextSize?: number
  titleTextWeight?: number
  /** Body text. Fallback: textColor/textSize/textWeight */
  bodyTextColor?: string
  bodyTextSize?: number
  bodyTextWeight?: number
  width: number
  height: number
  autoSize: boolean
}

export type NodeDragState = {
  ids: string[]
  pointerId: number
  startClientX: number
  startClientY: number
  startPositions: Record<string, Point>
  active: boolean
}

export type MenuState = {
  screenX: number
  screenY: number
  worldX: number
  worldY: number
}

export type NodeResizeState = {
  id: string
  pointerId: number
  startClientX: number
  startClientY: number
  startWidth: number
  startHeight: number
  minWidth: number
  minHeight: number
}

export type SelectionTool = "square" | "circle" | "draw"

export type SelectionState = {
  pointerId: number
  tool: SelectionTool
  start: Point
  current: Point
  points: Point[]
}

export type Size = {
  width: number
  height: number
}

export type PendingNodeTransform =
  | {
      mode: "resize"
      id: string
      width: number
      height: number
    }
  | {
      mode: "drag"
      positions: Record<string, Point>
    }

export type EditingField =
  | { kind: "title" | "body"; nodeId: string }
  | { kind: "table-column"; nodeId: string; columnIndex: number }
  | { kind: "table-cell"; nodeId: string; rowIndex: number; columnIndex: number }

export const DEFAULT_GRID: GridSettings = {
  type: "square",
  color: "#94a3b8",
  distance: 40,
  steps: 5,
  opacity: 0.32,
  thickness: 1,
}

export const CARD_OPTIONS: Array<{ type: CardType; label: string }> = [
  { type: "square-body", label: "square(body)" },
  { type: "square-title-body", label: "square(title+body)" },
  { type: "square-table", label: "table" },
  { type: "square-list-column", label: "list_column" },
  { type: "circle-body", label: "circle(body)" },
]

export const TABLE_COLUMN_MIN_WIDTH = 112
/** Horizontal padding of the table card (p-4 = 16*2) for min-width calculation */
export const TABLE_CARD_PADDING_X = 32
/** Width of the add-column cell in the table header (before:resize min width) */
export const TABLE_ADD_COLUMN_CELL_WIDTH = 48
/** Top offset from card top to the table wrapper start (title block + spacing). */
export const TABLE_WRAPPER_OFFSET_Y = 58
/** Row height for list-style table schema items. */
export const TABLE_LIST_ITEM_HEIGHT = 56
/** Approximate table header row height for edge anchors and hit-test */
/** Y offset for connection arrow anchor (bottom of header row). */
export const TABLE_HEADER_HEIGHT = 44
/** Vertical span from card top to below table header row; used for connection drop hit-test. */
export const TABLE_HEADER_HIT_HEIGHT = 100

export const SQLITE_TYPES: SqliteType[] = ["INTEGER", "TEXT", "REAL", "BLOB"]

/** Combined type option for dropdown: base type or primarykey_<type> */
export type ColumnTypeOption = SqliteType | `PRIMARYKEY_${SqliteType}`

export const COLUMN_TYPE_OPTIONS: { value: ColumnTypeOption; label: string }[] = [
  ...SQLITE_TYPES.map((t) => ({ value: t as ColumnTypeOption, label: t })),
  ...SQLITE_TYPES.map((t) => ({
    value: `PRIMARYKEY_${t}` as ColumnTypeOption,
    label: `primarykey_${t.toLowerCase()}`,
  })),
]
