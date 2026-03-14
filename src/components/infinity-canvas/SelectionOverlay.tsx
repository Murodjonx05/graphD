import type { SelectionState } from "./types"

type Props = {
  selection: SelectionState
}

export function SelectionOverlay({ selection }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[6]">
      {selection.tool === "square" && (
        <div
          className="absolute border border-sky-500/80 bg-sky-500/10"
          style={{
            left: Math.min(selection.start.x, selection.current.x),
            top: Math.min(selection.start.y, selection.current.y),
            width: Math.abs(selection.current.x - selection.start.x),
            height: Math.abs(selection.current.y - selection.start.y),
          }}
        />
      )}
      {selection.tool === "circle" && (
        <div
          className="absolute rounded-full border border-sky-500/80 bg-sky-500/10"
          style={{
            left:
              selection.start.x -
              Math.hypot(
                selection.current.x - selection.start.x,
                selection.current.y - selection.start.y
              ),
            top:
              selection.start.y -
              Math.hypot(
                selection.current.x - selection.start.x,
                selection.current.y - selection.start.y
              ),
            width:
              Math.hypot(
                selection.current.x - selection.start.x,
                selection.current.y - selection.start.y
              ) * 2,
            height:
              Math.hypot(
                selection.current.x - selection.start.x,
                selection.current.y - selection.start.y
              ) * 2,
          }}
        />
      )}
      {selection.tool === "draw" && selection.points.length > 1 && (
        <svg className="absolute inset-0 h-full w-full">
          <path
            d={`M ${selection.points.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`}
            fill="rgba(14, 165, 233, 0.1)"
            stroke="rgba(14, 165, 233, 0.85)"
            strokeWidth="1.5"
          />
        </svg>
      )}
    </div>
  )
}
