"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="group rounded-full"
    >
      {theme === "dark" ? (
        <Sun className="h-[1.2rem] w-[1.2rem] transition-all group-hover:scale-125 group-hover:stroke-amber-500 group-hover:fill-amber-500" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] transition-all group-hover:scale-125 group-hover:stroke-primary group-hover:fill-primary" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
