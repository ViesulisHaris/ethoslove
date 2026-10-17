"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useMounted } from "@/hooks/use-mounted";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const t = useTranslations("common");
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useMounted();

  const Icon = mounted && resolvedTheme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-lg" aria-label={t("theme")}>
          <Icon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("theme")}</DropdownMenuLabel>
        {/* Radio items: the theme in use is checked (and says so to a screen reader), not only coloured. */}
        {/* "" until mounted: the server can't know the stored theme, and the group stays controlled throughout. */}
        <DropdownMenuRadioGroup value={mounted ? (theme ?? "system") : ""} onValueChange={setTheme}>
          {(
            [
              ["light", Sun, t("themeLight")],
              ["dark", Moon, t("themeDark")],
              ["system", Laptop, t("themeSystem")],
            ] as const
          ).map(([value, ItemIcon, label]) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <ItemIcon />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
