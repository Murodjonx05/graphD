import { useEffect, useState } from "react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const links = [
  { href: "/", label: "Overview" },
  { href: "/about", label: "Graph Lab" },
  { href: "/contact", label: "Signals" },
]

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5" />
      <path d="M12 19.5V22" />
      <path d="M4.93 4.93 6.7 6.7" />
      <path d="M17.3 17.3 19.07 19.07" />
      <path d="M2 12h2.5" />
      <path d="M19.5 12H22" />
      <path d="m4.93 19.07 1.77-1.77" />
      <path d="m17.3 6.7 1.77-1.77" />
    </svg>
  )
}

function getPathname() {
  if (typeof window !== "undefined") {
    return window.location.pathname
  }
  return "/"
}

function getPreferredTheme() {
  if (typeof window === "undefined") {
    return "light"
  }

  const storedTheme = window.localStorage.getItem("graphd-theme")

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function Nav() {
  const [activeHref, setActiveHref] = useState(getPathname())
  const [theme, setTheme] = useState<"light" | "dark">(getPreferredTheme)

  useEffect(() => {
    const handlePopstate = () => {
      setActiveHref(getPathname())
    }
    window.addEventListener("popstate", handlePopstate)
    return () => {
      window.removeEventListener("popstate", handlePopstate)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement

    root.classList.toggle("dark", theme === "dark")
    window.localStorage.setItem("graphd-theme", theme)
    window.dispatchEvent(new CustomEvent("themechange", { detail: theme }))
  }, [theme])

  const handleNavClick = (href: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (href.startsWith("/")) {
      e.preventDefault()
      window.history.pushState({}, "", href)
      setActiveHref(href)
      window.dispatchEvent(new PopStateEvent("popstate"))
    }
  }

  return (
    <header className="border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <a href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
            G
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold tracking-tight text-foreground">
                graphD
              </p>
              <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                beta
              </span>
            </div>
            <p className="truncate text-sm text-muted-foreground">
              Visual data workspace
            </p>
          </div>
        </a>

        <div className="flex items-center gap-3">
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const isActive = activeHref === link.href

              return (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    buttonVariants({
                      variant: isActive ? "secondary" : "ghost",
                      size: "sm",
                    }),
                    "rounded-md px-4"
                  )}
                  onClick={(e) => handleNavClick(link.href, e)}
                >
                  {link.label}
                </a>
              )
            })}
          </nav>

          <button
            type="button"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            className={cn(
              buttonVariants({
                variant: "ghost",
                size: "sm",
              }),
              "rounded-md px-3"
            )}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Nav
