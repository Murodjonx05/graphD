import type { CanvasNode } from "./types"
import { isCircleLikeNode } from "./node-utils"
import { clamp } from "./grid"

type Props = {
  selectedNode: CanvasNode
  selectedNodeIds: string[]
  updateSelectedNode: (patch: Partial<CanvasNode>) => void
  getNodeResizeMinSize: (node: CanvasNode) => { width: number; height: number }
  stopCanvasPan: (event: React.PointerEvent<HTMLElement>) => void
}

export function CanvasPropertiesPanel({
  selectedNode,
  selectedNodeIds,
  updateSelectedNode,
  getNodeResizeMinSize,
  stopCanvasPan,
}: Props) {
  return (
    <div
      className="absolute bottom-5 right-5 z-20 w-72 rounded-2xl border border-border/80 bg-background/95 p-4 shadow-xl backdrop-blur"
      onPointerDown={stopCanvasPan}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        properties
      </p>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">id</span>
          <span className="truncate font-medium text-foreground">
            {selectedNodeIds.length > 1 ? `${selectedNodeIds.length} selected` : selectedNode.id}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">type</span>
          <span className="font-medium text-foreground">
            {selectedNodeIds.length > 1 ? "multi" : selectedNode.type}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">x</span>
          <span className="font-medium text-foreground">{Math.round(selectedNode.x)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">y</span>
          <span className="font-medium text-foreground">{Math.round(selectedNode.y)}</span>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        `Ctrl/Cmd + C` copy, `Ctrl/Cmd + V` paste, drag selected cards together.
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">size_mode</span>
          <select
            value={selectedNode.autoSize ? "content" : "manual"}
            onChange={(e) => updateSelectedNode({ autoSize: e.target.value === "content" })}
            className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Size mode"
          >
            <option value="content">content-size</option>
            <option value="manual">manual</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">bg_color</span>
          <input
            type="color"
            value={selectedNode.backgroundColor}
            onChange={(e) => updateSelectedNode({ backgroundColor: e.target.value })}
            className="h-9 w-full rounded-lg border border-border bg-transparent p-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Background color"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">opacity</span>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={selectedNode.opacity}
            onChange={(e) => updateSelectedNode({ opacity: clamp(Number(e.target.value), 0.1, 1) })}
            className="h-9 w-full accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Card opacity"
          />
        </label>
        <div className="col-span-2 border-t border-border/60 pt-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            title
          </p>
          <div className="grid grid-cols-3 gap-2">
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">color</span>
              <input
                type="color"
                value={selectedNode.titleTextColor ?? selectedNode.textColor}
                onChange={(e) => updateSelectedNode({ titleTextColor: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-transparent p-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Title text color"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">size</span>
              <input
                type="number"
                min={10}
                max={32}
                value={selectedNode.titleTextSize ?? selectedNode.textSize}
                onChange={(e) =>
                  updateSelectedNode({
                    titleTextSize: clamp(
                      Number(e.target.value) || (selectedNode.titleTextSize ?? selectedNode.textSize),
                      10,
                      32
                    ),
                  })
                }
                className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Title text size"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">weight</span>
              <input
                type="number"
                min={300}
                max={800}
                step={100}
                value={selectedNode.titleTextWeight ?? selectedNode.textWeight}
                onChange={(e) =>
                  updateSelectedNode({
                    titleTextWeight: clamp(
                      Number(e.target.value) || (selectedNode.titleTextWeight ?? selectedNode.textWeight),
                      300,
                      800
                    ),
                  })
                }
                className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Title text weight"
              />
            </label>
          </div>
        </div>
        <div className="col-span-2 border-t border-border/60 pt-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            body
          </p>
          <div className="grid grid-cols-3 gap-2">
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">color</span>
              <input
                type="color"
                value={selectedNode.bodyTextColor ?? selectedNode.textColor}
                onChange={(e) => updateSelectedNode({ bodyTextColor: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-transparent p-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Body text color"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">size</span>
              <input
                type="number"
                min={10}
                max={32}
                value={selectedNode.bodyTextSize ?? selectedNode.textSize}
                onChange={(e) =>
                  updateSelectedNode({
                    bodyTextSize: clamp(
                      Number(e.target.value) || (selectedNode.bodyTextSize ?? selectedNode.textSize),
                      10,
                      32
                    ),
                  })
                }
                className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Body text size"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">weight</span>
              <input
                type="number"
                min={300}
                max={800}
                step={100}
                value={selectedNode.bodyTextWeight ?? selectedNode.textWeight}
                onChange={(e) =>
                  updateSelectedNode({
                    bodyTextWeight: clamp(
                      Number(e.target.value) || (selectedNode.bodyTextWeight ?? selectedNode.textWeight),
                      300,
                      800
                    ),
                  })
                }
                className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Body text weight"
              />
            </label>
          </div>
        </div>
        {isCircleLikeNode(selectedNode) ? (
          <label className="col-span-2 space-y-1">
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">size</span>
            <input
              type="number"
              min={Math.min(
                getNodeResizeMinSize(selectedNode).width,
                getNodeResizeMinSize(selectedNode).height
              )}
              max={720}
              value={Math.max(selectedNode.width, selectedNode.height)}
              onChange={(e) => {
                const minSize = getNodeResizeMinSize(selectedNode)
                const minSide = Math.min(minSize.width, minSize.height)
                const size = clamp(Number(e.target.value) || selectedNode.width, minSide, 720)
                updateSelectedNode({ width: size, height: size, autoSize: false })
              }}
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Size (width and height)"
            />
          </label>
        ) : (
          <>
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">width</span>
              <input
                type="number"
                min={80}
                max={720}
                value={selectedNode.width}
                onChange={(e) => {
                  const minSize = getNodeResizeMinSize(selectedNode)
                  updateSelectedNode({
                    width: clamp(Number(e.target.value) || selectedNode.width, minSize.width, 720),
                    autoSize: false,
                  })
                }}
                className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Width"
              />
            </label>
            <label className="col-span-2 space-y-1">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">height</span>
              <input
                type="number"
                min={80}
                max={720}
                value={selectedNode.height}
                onChange={(e) => {
                  const minSize = getNodeResizeMinSize(selectedNode)
                  updateSelectedNode({
                    height: clamp(Number(e.target.value) || selectedNode.height, minSize.height, 720),
                    autoSize: false,
                  })
                }}
                className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Height"
              />
            </label>
          </>
        )}
      </div>
    </div>
  )
}
