import type { SelectionTool } from "./types"
import { useInfiniteCanvasState } from "./useInfiniteCanvasState"
import { useInfiniteCanvasEffects } from "./useInfiniteCanvasEffects"
import { useInfiniteCanvasHandlers } from "./useInfiniteCanvasHandlers"
import { CanvasNodeLayer } from "./CanvasNodeLayer"
import { SelectionOverlay } from "./SelectionOverlay"
import { CanvasSettingsPanel } from "./CanvasSettingsPanel"
import { CanvasPropertiesPanel } from "./CanvasPropertiesPanel"
import { CanvasContextMenu } from "./CanvasContextMenu"

function InfiniteCanvas() {
  const state = useInfiniteCanvasState()
  useInfiniteCanvasEffects({
    canvasRef: state.refs.canvasRef,
    grid: state.state.grid,
    offset: state.state.offset,
    viewport: state.state.viewport,
    zoom: state.state.zoom,
    themeVersion: state.state.themeVersion,
    nodes: state.state.nodes,
    selectedNodeIds: state.state.selectedNodeIds,
    clipboardNodes: state.state.clipboardNodes,
    setClipboardNodes: state.setClipboardNodes,
    setNodes: state.setNodes,
    setSelectedNodeIds: state.setSelectedNodeIds,
    setEditingField: state.setEditingField,
    findOpenPositionForNode: state.findOpenPositionForNode,
    isFocusInTextEditable: state.isFocusInTextEditable,
  })
  const handlers = useInfiniteCanvasHandlers(state)

  const {
    refs: { canvasRef, containerRef },
    state: {
      grid,
      offset,
      viewport,
      isDragging,
      menu,
      nodes,
      selectedNodeIds,
      selectionTool,
      selectionState,
      selectedNode,
      zoom,
    },
    setGrid,
    setOffset,
    setSelectedNodeIds,
    setSelectionTool,
    setZoom,
    setEditingField,
    setEditingValue,
    stopCanvasPan,
    setNodeContentElement,
    setTableWrapperElement,
    updateNode,
    syncNodeContentMinSize,
    getNodeResizeMinSize,
  } = state

  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    handleCanvasContextMenu,
    createNode,
    handleNodePointerDown,
    handleNodePointerUp,
    handleResizePointerDown,
    getNodeStyle,
    updateSelectedNode,
    getNodeSurfaceStyle,
  } = handlers

  return (
    <section className="relative h-[calc(100vh-4rem)] overflow-hidden bg-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.1),_transparent_24%)]" />
      <div
        ref={containerRef}
        className="relative h-full w-full touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onContextMenu={handleCanvasContextMenu}
      >
        <canvas
          ref={canvasRef}
          className={
            isDragging ? "block h-full w-full cursor-grabbing" : "block h-full w-full cursor-default"
          }
        />
        <CanvasNodeLayer
          nodes={nodes}
          selectedNodeIds={selectedNodeIds}
          getNodeStyle={getNodeStyle}
          getNodeSurfaceStyle={getNodeSurfaceStyle}
          setNodeContentElement={setNodeContentElement}
          setTableWrapperElement={setTableWrapperElement}
          editingField={state.state.editingField}
          editingValue={state.state.editingValue}
          setEditingField={setEditingField}
          setEditingValue={setEditingValue}
          updateNode={updateNode}
          syncNodeContentMinSize={syncNodeContentMinSize}
          onNodePointerDown={handleNodePointerDown}
          onNodePointerUp={handleNodePointerUp}
          onResizePointerDown={handleResizePointerDown}
          onSelectNode={(id) => setSelectedNodeIds([id])}
        />
        {selectionState && <SelectionOverlay selection={selectionState} />}
        <CanvasSettingsPanel
          grid={grid}
          setGrid={setGrid}
          setOffset={setOffset}
          setZoom={setZoom}
          stopCanvasPan={stopCanvasPan}
        />
        <div
          className="absolute left-1/2 top-5 z-10 flex -translate-x-1/2 items-center gap-2"
          onPointerDown={stopCanvasPan}
        >
          {(["square", "circle", "draw"] as SelectionTool[]).map((tool) => (
            <button
              key={tool}
              type="button"
              aria-label={`Selection tool: ${tool === "square" ? "rectangle" : tool === "circle" ? "ellipse" : "free draw"}`}
              onClick={() => setSelectionTool(tool)}
              className={
                selectionTool === tool
                  ? "rounded-xl border border-sky-500/60 bg-sky-500/10 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-sky-600 shadow-sm backdrop-blur focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  : "rounded-xl border border-border/70 bg-background/90 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground shadow-sm backdrop-blur transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              }
            >
              {`select_${tool}`}
            </button>
          ))}
        </div>
        <div className="absolute right-5 top-5 z-10 flex items-start gap-2" onPointerDown={stopCanvasPan}>
          <div className="rounded-xl border border-border/70 bg-background/90 px-3 py-2 shadow-md backdrop-blur">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">x_pos</p>
            <p className="mt-1 text-base font-semibold text-foreground">{Math.round(offset.x)}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/90 px-3 py-2 shadow-md backdrop-blur">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">y_pos</p>
            <p className="mt-1 text-base font-semibold text-foreground">{Math.round(offset.y)}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/90 px-3 py-2 shadow-md backdrop-blur">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">zoom</p>
            <p className="mt-1 text-base font-semibold text-foreground">{Math.round(zoom * 100)}%</p>
          </div>
        </div>
        {selectedNode && (
          <CanvasPropertiesPanel
            selectedNode={selectedNode}
            selectedNodeIds={selectedNodeIds}
            updateSelectedNode={updateSelectedNode}
            getNodeResizeMinSize={getNodeResizeMinSize}
            stopCanvasPan={stopCanvasPan}
          />
        )}
        {menu && (
          <CanvasContextMenu
            menu={menu}
            viewport={viewport}
            createNode={createNode}
            stopCanvasPan={stopCanvasPan}
          />
        )}
      </div>
    </section>
  )
}

export default InfiniteCanvas
