import * as React from "react"

import { cn } from "@/lib/utils"

const badgeVariants = {
  default:
    "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
  secondary:
    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive:
    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
  outline: "text-foreground",
  muted:
    "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
  "primary-key":
    "border-transparent bg-primary/15 text-primary hover:bg-primary/25",
}

type BadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: keyof typeof badgeVariants
}

function Badge({ className, variant = "muted", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
