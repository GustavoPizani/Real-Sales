"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggleIcon({ variant = "sidebar" }: { variant?: "sidebar" | "header" }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isHeader = variant === "header";

  if (!mounted) {
    return <div className={isHeader ? "h-8 w-8" : "h-9 w-9"} />;
  }

  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
      className={cn(
        "relative",
        isHeader
          ? "text-white hover:bg-white/20 hover:text-white h-8 w-8"
          : "h-9 w-9 text-muted-foreground hover:text-foreground"
      )}
    >
      {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      <span className="sr-only">Alternar tema claro/escuro</span>
    </Button>
  );
}
