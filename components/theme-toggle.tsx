"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={cn("h-9 w-[176px] rounded-full bg-muted animate-pulse", className)} />;
  }

  const isDark = theme === "dark";

  return (
    <div className={cn("inline-flex items-center rounded-full border border-border bg-muted/50 p-1", className)}>
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
          !isDark ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Sun className="h-4 w-4" /> Claro
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
          isDark ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Moon className="h-4 w-4" /> Escuro
      </button>
    </div>
  );
}
