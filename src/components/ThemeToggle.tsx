"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "dark" | "light";

/** Light/dark switch. The actual theme is applied to <html data-theme> by an
 *  inline script in the layout (before paint) so there's no flash; this just
 *  flips it and remembers the choice. */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = (document.documentElement.getAttribute("data-theme") as Theme) || "dark";
    setTheme(current);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode — ignore */
    }
  }

  const isLight = mounted && theme === "light";

  return (
    <button
      onClick={toggle}
      aria-label="Toggle light/dark theme"
      className="glass-2 flex w-full items-center justify-between px-3 py-2.5 text-sm text-fg/80 transition hover:text-fg"
    >
      <span className="inline-flex items-center gap-2">
        {isLight ? (
          <Sun className="h-4 w-4 text-accent-soft" />
        ) : (
          <Moon className="h-4 w-4 text-accent-soft" />
        )}
        {mounted ? (isLight ? "Light" : "Dark") : "Theme"} mode
      </span>
      <span className="text-[10px] text-muted">switch</span>
    </button>
  );
}
