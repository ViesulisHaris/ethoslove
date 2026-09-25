"use client";

import { useTransition } from "react";
import { CalendarHeart, LogOut, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ShellUser = { email: string; name: string | null };

export function UserMenu({ user }: { user: ShellUser }) {
  const t = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initials = (user.name ?? user.email).slice(0, 2).toUpperCase();

  const logout = () => {
    startTransition(async () => {
      await fetch("/auth/signout", { method: "POST" });
      router.push("/");
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-11 w-full justify-start gap-3 px-2" disabled={pending}>
          <Avatar className="size-8">
            <AvatarFallback className="bg-coral/15 text-xs font-semibold text-coral">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm">{user.name ?? user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="truncate text-[13px] font-normal tracking-normal normal-case">
          {user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/my-dates">
            <CalendarHeart className="size-4" />
            {t("myDates")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account">
            <Settings className="size-4" />
            {t("account")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={logout}>
          <LogOut className="size-4" />
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
