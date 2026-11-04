"use client"

import { useLayoutEffect, useState } from "react"

export const THEME_KEY = "ign-theme"
export type ThemeChoice = "light" | "dark"

export function applyTheme(theme: ThemeChoice) {
  document.documentElement.setAttribute("data-theme", theme)
  localStorage.setItem(THEME_KEY, theme)
}

export function readTheme(): ThemeChoice {
  if (typeof document === "undefined") return "light"
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"
}

export function ThemeSwitch() {
  const [theme, setTheme] = useState<ThemeChoice>("light")

  useLayoutEffect(() => {
    const saved = localStorage.getItem(THEME_KEY)
    const next: ThemeChoice = saved === "dark" ? "dark" : "light"
    if (document.documentElement.getAttribute("data-theme") !== next) applyTheme(next)
    setTheme(next)
  }, [])

  function choose(next: ThemeChoice) {
    applyTheme(next)
    setTheme(next)
  }

  const next = theme === "dark" ? "light" : "dark"
  return (
    <>
      <div className="hidden shrink-0 rounded-full border bg-background/70 p-0.5 min-[380px]:inline-flex" role="group" aria-label="Color theme">
        <ThemeChoiceButton current={theme} value="light" onChoose={choose}>Light</ThemeChoiceButton>
        <ThemeChoiceButton current={theme} value="dark" onChoose={choose}>Dark</ThemeChoiceButton>
      </div>
      <button
        type="button"
        className="inline-flex h-7 shrink-0 items-center rounded-full border bg-background/70 px-2.5 text-[11px] font-semibold min-[380px]:hidden"
        aria-label={next === "dark" ? "Switch to dark mode" : "Switch to light mode"}
        onClick={() => choose(next)}
      >
        {next === "dark" ? "Dark" : "Light"}
      </button>
    </>
  )
}

function ThemeChoiceButton({
  current,
  value,
  onChoose,
  children,
}: {
  current: ThemeChoice
  value: ThemeChoice
  onChoose: (theme: ThemeChoice) => void
  children: string
}) {
  const selected = current === value
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onChoose(value)}
      className={`h-7 rounded-full px-2.5 text-[11px] font-semibold ${selected ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  )
}
