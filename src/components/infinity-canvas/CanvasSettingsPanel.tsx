import type { GridSettings } from "./types"
import { DEFAULT_GRID } from "./types"
import { SettingsIcon, clamp } from "./grid"

type Props = {
  grid: GridSettings
  setGrid: React.Dispatch<React.SetStateAction<GridSettings>>
  setOffset: (value: { x: number; y: number }) => void
  setZoom: (value: number) => void
  stopCanvasPan: (event: React.PointerEvent<HTMLElement>) => void
}

export function CanvasSettingsPanel({
  grid,
  setGrid,
  setOffset,
  setZoom,
  stopCanvasPan,
}: Props) {
  return (
    <div className="absolute left-5 top-5 z-10" onPointerDown={stopCanvasPan}>
      <details
        className="rounded-xl border border-border/70 bg-background/90 shadow-md backdrop-blur"
        aria-label="Grid and view settings"
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <SettingsIcon />
          <span>settings</span>
        </summary>
        <div className="w-[220px] space-y-3 border-t border-border/60 p-3" onPointerDown={stopCanvasPan}>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">type</span>
            <select
              value={grid.type}
              onChange={(e) =>
                setGrid((current) => ({
                  ...current,
                  type: e.target.value as GridSettings["type"],
                }))
              }
              className="h-8 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Grid type"
            >
              <option value="square">squared</option>
              <option value="rounded">rounded</option>
              <option value="web">spider</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">color</span>
              <input
                type="color"
                value={grid.color}
                onChange={(e) => setGrid((current) => ({ ...current, color: e.target.value }))}
                className="h-8 w-full rounded-lg border border-border bg-transparent p-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Grid color"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">distance</span>
              <input
                type="number"
                min={10}
                max={220}
                value={grid.distance}
                onChange={(e) =>
                  setGrid((current) => ({
                    ...current,
                    distance: clamp(Number(e.target.value) || current.distance, 10, 220),
                  }))
                }
                className="h-8 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Grid distance"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">steps</span>
              <input
                type="number"
                min={2}
                max={16}
                value={grid.steps}
                onChange={(e) =>
                  setGrid((current) => ({
                    ...current,
                    steps: clamp(Number(e.target.value) || current.steps, 2, 16),
                  }))
                }
                className="h-8 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Grid steps"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">opacity</span>
              <input
                type="range"
                min={0.08}
                max={1}
                step={0.02}
                value={grid.opacity}
                onChange={(e) =>
                  setGrid((current) => ({
                    ...current,
                    opacity: clamp(Number(e.target.value), 0.08, 1),
                  }))
                }
                className="h-8 w-full accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Grid opacity"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">thickness</span>
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.1}
                value={grid.thickness}
                onChange={(e) =>
                  setGrid((current) => ({
                    ...current,
                    thickness: clamp(Number(e.target.value), 0.5, 3),
                  }))
                }
                className="h-8 w-full accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Grid line thickness"
              />
            </label>
          </div>
          <button
            type="button"
            aria-label="Reset grid and zoom"
            onClick={() => {
              setOffset({ x: 0, y: 0 })
              setGrid(DEFAULT_GRID)
              setZoom(1)
            }}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            reset
          </button>
        </div>
      </details>
    </div>
  )
}
