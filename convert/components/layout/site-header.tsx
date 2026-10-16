"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Search } from "lucide-react";

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
import { NAV_ITEMS, SITE } from "@/config/site";
import { useAuth, type AuthUser } from "@/hooks/use-auth";
import { signInWithGoogle, signOut } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  /** Omitted on pages where a search box would do nothing. */
  search?: { value: string; setValue: (value: string) => void };
};

export function SiteHeader({ search }: SiteHeaderProps) {
  const pathname = usePathname();
  const { user, admin } = useAuth();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || admin);

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <Image
            src={SITE.logo}
            alt={SITE.name}
            width={36}
            height={36}
            className="size-9 rounded-lg object-cover"
          />
          <span className="flex flex-col leading-tight">
            <span className="font-serif text-lg font-bold">{SITE.name}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {SITE.tagline}
            </span>
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <NavLink key={item.href} href={item.href} active={isActive(pathname, item.href)}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {search && (
          <div className="relative ml-auto hidden w-full max-w-xs md:block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search.value}
              onChange={(e) => search.setValue(e.target.value)}
              placeholder="Search questions…"
              aria-label="Search questions"
              className="h-9 pl-9"
            />
          </div>
        )}

        <div className={cn("flex items-center gap-2", !search && "ml-auto")}>
          <AccountMenu user={user} admin={admin} />
        </div>
      </div>

      {/* The nav and search do not fit one row on a phone, so they get a second. */}
      <div className="flex items-center gap-2 px-4 pb-3 md:hidden">
        <nav className="flex items-center gap-1">
          {items.map((item) => (
            <NavLink key={item.href} href={item.href} active={isActive(pathname, item.href)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        {search && (
          <div className="relative ml-auto w-full max-w-[14rem]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search.value}
              onChange={(e) => search.setValue(e.target.value)}
              placeholder="Search…"
              aria-label="Search questions"
              className="h-9 pl-9"
            />
          </div>
        )}
      </div>
    </header>
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
        "font-mono text-xs tracking-wider uppercase",
        active ? "bg-muted text-foreground" : "text-muted-foreground",
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
