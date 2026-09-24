"use client";

import { useState } from "react";
import { Gift, Menu, Plus, Settings, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/shared/logo";
import { AppTheme } from "./app-theme";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu, type ShellUser } from "./user-menu";

type NavItem = { href: string; label: string; icon: LucideIcon };

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="App">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ user, children }: { user: ShellUser | null; children: React.ReactNode }) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);

  const nav: NavItem[] = [
    { href: "/dashboard", label: t("dashboard"), icon: Gift },
    { href: "/account", label: t("account"), icon: Settings },
  ];

  return (
    <AppTheme>
      <div className="flex min-h-dvh bg-background text-foreground">
        {/* Desktop sidebar. Neither bar shows inside the iPhone app, whose own bar and tabs stand in for them. */}
        <aside data-app-hide className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
          <Link href="/" className="mb-8 px-2 pt-1" aria-label={t("brand")}>
            <Logo />
          </Link>
          <Button asChild className="mb-6 h-10 justify-start rounded-lg">
            <Link href="/templates">
              <Plus className="size-4" />
              {t("createGift")}
            </Link>
          </Button>
          <NavLinks items={nav} />
          <div className="mt-auto flex flex-col gap-2 border-t border-sidebar-border pt-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-muted-foreground">{t("theme")}</span>
              <ThemeToggle />
            </div>
            {user ? <UserMenu user={user} /> : null}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <header data-app-hide className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur md:hidden">
            <Link href="/" aria-label={t("brand")}>
              <Logo />
            </Link>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon-lg" aria-label={t("openMenu")}>
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" closeLabel={t("closeMenu")} className="w-72 bg-sidebar p-4">
                  <SheetTitle className="sr-only">{t("openMenu")}</SheetTitle>
                  <div className="flex h-full flex-col gap-6 pt-8">
                    <Logo />
                    <Button asChild className="h-10 justify-start rounded-lg">
                      <Link href="/templates" onClick={() => setOpen(false)}>
                        <Plus className="size-4" />
                        {t("createGift")}
                      </Link>
                    </Button>
                    <NavLinks items={nav} onNavigate={() => setOpen(false)} />
                    <div className="mt-auto border-t border-sidebar-border pt-4">
                      {user ? <UserMenu user={user} /> : null}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </header>
          <main id="main" className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </AppTheme>
  );
}
