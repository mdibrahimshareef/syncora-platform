"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 border border-border/40" disabled>
        <div className="h-[1.2rem] w-[1.2rem] rounded-full" />
      </Button>
    )
  }

  const currentTheme = theme === 'system' ? resolvedTheme : theme

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full w-9 h-9 border border-border/40 hover:bg-muted/50 transition-colors"
      onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {currentTheme === "dark" ? (
        <Moon className="h-[1.2rem] w-[1.2rem] text-sky-400" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem] text-amber-500" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
