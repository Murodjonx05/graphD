import type { MenuState } from "./types"
import { CARD_OPTIONS } from "./types"
import type { CardType } from "./types"

type Props = {
  menu: MenuState
  viewport: { width: number; height: number }
  createNode: (type: CardType) => void
  stopCanvasPan: (event: React.PointerEvent<HTMLElement>) => void
}

export function CanvasContextMenu({ menu, viewport, createNode, stopCanvasPan }: Props) {
  return (
    <div
      className="absolute z-20 min-w-64 rounded-2xl border border-border/80 bg-background/95 p-2 shadow-xl backdrop-blur"
      style={{
        left: Math.min(menu.screenX, Math.max(12, viewport.width - 280)),
        top: Math.min(menu.screenY, Math.max(12, viewport.height - 260)),
      }}
      onPointerDown={stopCanvasPan}
    >
      <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        create card
      </p>
      <div className="space-y-1">
        {CARD_OPTIONS.map((option) => (
          <button
            key={option.type}
            type="button"
            aria-label={`Create ${option.label}`}
            onClick={() => createNode(option.type)}
            className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
