"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Search } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NAV_ITEMS, SITE } from "@/config/site";
import { useAuth, type AuthUser } from "@/hooks/use-auth";
import { signInWithGoogle, signOut } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  /** Omitted on pages where a search box would do nothing. */
  search?: { value: string; setValue: (value: string) => void };
};

export function SiteHeader({ search }: SiteHeaderProps) {
  const pathname = usePathname() ?? "/";
  const { user, admin } = useAuth();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || admin);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07111f]/75 text-white shadow-[0_12px_30px_-18px_rgba(0,0,0,0.7)] backdrop-blur-xl">
      <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <Image
            src={SITE.logo}
            alt={SITE.name}
            width={36}
            height={36}
            className="size-9 rounded-lg object-cover ring-1 ring-[var(--sw-brass)]/40 transition-transform duration-300 hover:rotate-[-6deg] hover:scale-110"
          />
          <span className="flex flex-col leading-tight">
            <span className="font-serif text-lg font-bold text-white">{SITE.name}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--sw-brass-light)]">
              {SITE.tagline}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center justify-center gap-1 md:flex">
          {items.map((item) => (
            <NavLink key={item.href} href={item.href} active={isActive(pathname, item.href)}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="col-start-3 flex items-center justify-self-end gap-2">
          {search && (
            <div className="relative hidden w-full max-w-xs md:block">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/60" />
              <Input
                type="search"
                value={search.value}
                onChange={(e) => search.setValue(e.target.value)}
                placeholder="Search questions…"
                aria-label="Search questions"
                className="h-9 border-white/15 bg-white/10 pl-9 text-white placeholder:text-white/50 focus-visible:border-[var(--sw-brass)]"
              />
            </div>
          )}
          <div className="hidden md:block">
            <AccountMenu user={user} admin={admin} />
          </div>
          <MobileMenu items={items} pathname={pathname} user={user} admin={admin} />
        </div>
      </div>

      {/* On a phone the search takes its own row, so it is never squeezed. */}
      {search && (
        <div className="px-3 pb-3 md:hidden">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/60" />
            <Input
              type="search"
              value={search.value}
              onChange={(e) => search.setValue(e.target.value)}
              placeholder="Search questions…"
              aria-label="Search questions"
              className="h-10 border-white/15 bg-white/10 pl-9 text-white placeholder:text-white/50 focus-visible:border-[var(--sw-brass)]"
            />
          </div>
        </div>
      )}
    </header>
  );
}

/**
 * The menu for anything narrower than a tablet: the same links as the bar,
 * plus the account, in a drawer. It is keyed to the page it was opened on, so
 * going to another page closes it without an effect to remember to write.
 */
function MobileMenu({
  items,
  pathname,
  user,
  admin,
}: {
  items: readonly { href: string; label: string }[];
  pathname: string;
  user: AuthUser | null;
  admin: boolean;
}) {
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  return (
    <Sheet open={open} onOpenChange={(next) => setOpenOn(next ? pathname : null)}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open the menu"
            className="size-10 text-white hover:bg-white/10 hover:text-white md:hidden"
          >
            <Menu className="size-5" />
          </Button>
        }
      />
      <SheetContent
        side="right"
        className="w-[86vw] max-w-sm gap-0 border-white/10 bg-[var(--sw-ink)] p-0 text-white [&_[data-slot=sheet-close]]:text-white [&_[data-slot=sheet-close]]:hover:bg-white/10 [&_[data-slot=sheet-close]]:hover:text-white"
      >
        <SheetHeader className="border-b border-white/10 p-5 pr-14">
          <SheetTitle className="flex items-center gap-3 font-serif text-lg text-white">
            <Image src={SITE.logo} alt="" width={32} height={32} className="size-8 rounded-lg object-cover" />
            {SITE.name}
          </SheetTitle>
        </SheetHeader>

        <nav className="grid gap-1 p-3" aria-label="Main">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpenOn(null)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between rounded-xl px-4 py-3.5 font-mono text-sm tracking-wider uppercase transition-colors",
                  active
                    ? "bg-[image:var(--sw-grad-sol)] text-white shadow-[0_8px_16px_-8px_rgba(0,0,0,0.6)]"
                    : "text-white/75 hover:bg-white/10 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/10 p-4">
          {user ? (
            <div className="grid gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-white/60">{user.email}</p>
                <Badge variant="secondary" className="mt-2">
                  {admin ? "Admin" : "Student"}
                </Badge>
              </div>
              <Button
                variant="outline"
                className="w-full border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white"
                onClick={async () => {
                  await signOut();
                  window.location.reload();
                }}
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={() => void signInWithGoogle()}
            >
              Sign in with Google
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      render={<Link href={href} />}
      nativeButton={false}
      variant="ghost"
      size="sm"
      className={cn(
        "relative font-mono text-xs tracking-wider uppercase after:absolute after:inset-x-2.5 after:-bottom-1.5 after:h-0.5 after:origin-left after:rounded-full after:bg-[var(--sw-brass)] after:transition-transform after:duration-300",
        active
          ? "text-white after:scale-x-100"
          : "text-white/65 after:scale-x-0 hover:bg-white/10 hover:text-white hover:after:scale-x-50",
      )}
    >
      {children}
    </Button>
  );
}

function AccountMenu({ user, admin }: { user: AuthUser | null; admin: boolean }) {
  if (!user) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white"
        onClick={() => void signInWithGoogle()}
      >
        Sign in
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            aria-label="Account"
            className="size-9 rounded-full p-0"
          >
            <Avatar className="size-9">
              <AvatarImage src={user.avatarUrl} alt="" />
              <AvatarFallback className="text-xs">
                {initials(user.name || user.email)}
              </AvatarFallback>
            </Avatar>
          </Button>
        }
      />

      <DropdownMenuContent align="end" className="w-60">
        {/* The Group is required, not decoration: DropdownMenuLabel renders
            Base UI's GroupLabel, which throws outside one. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="grid gap-0.5 px-2 py-1.5">
            <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
            <span className="truncate text-xs font-normal">{user.email}</span>
            <Badge variant="secondary" className="mt-1 w-fit">
              {admin ? "Admin" : "Student"}
            </Badge>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          onClick={async () => {
            await signOut();
            // Admin status is read once at boot, so a reload is simpler than
            // re-deriving every gated panel on the page.
            window.location.reload();
          }}
        >
          <LogOut className="size-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Two letters from a name, or one from an email. */
function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
