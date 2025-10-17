"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@ui/switch";
import { cn } from "@/lib/utils";
import { useState } from "react";

import * as SwitchPrimitive from "@radix-ui/react-switch";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [isChecked, setIsChecked] = useState(isDark);

  return (
    <div className="relative flex items-center gap-2 group/theme">
      <Switch
        checked={isChecked}
        onCheckedChange={(checked) => {
          setIsChecked(checked);
          setTheme(checked ? "dark" : "light");
        }}
        thumbClassName="size-6"
        customThumb={
          <SwitchPrimitive.Thumb
            className={cn(
              "border duration-300 h-8 w-8 pointer-events-none flex items-center justify-center rounded-full bg-background transition-all data-[state=checked]:translate-x-6 data-[state=unchecked]:-translate-x-1"
            )}
          >
            {resolvedTheme === "dark" ? (
              <MoonStar className="h-4 w-4 duration-500 transition-all group-hover/theme:scale-125 group-hover/theme:fill-primary group-hover/theme:stroke-primary fill-invert" />
            ) : (
              <SunMedium className="h-4 w-4 duration-500 transition-all group-hover/theme:scale-125 group-hover/theme:stroke-amber-500 " />
            )}
          </SwitchPrimitive.Thumb>
        }
        className="h-6 w-14"
      />
    </div>
  );
}
