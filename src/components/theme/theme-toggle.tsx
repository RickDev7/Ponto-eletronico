"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ThemeName } from "@/config/theme";

interface ThemeToggleProps {
  className?: string;
  /** Shadcn button variant passthrough */
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}

export function ThemeToggle({
  className,
  variant = "ghost",
  size = "icon",
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = (resolvedTheme ?? theme ?? "dark") === "dark";

  function toggleTheme() {
    const next: ThemeName = isDark ? "light" : "dark";
    setTheme(next);
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={toggleTheme}
      aria-label="Farbschema umschalten"
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-4" />
        ) : (
          <Moon className="size-4" />
        )
      ) : (
        <SunMoon className="size-4 text-muted-foreground" />
      )}
    </Button>
  );
}
