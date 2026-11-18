"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const LINKS = [
  { href: "/browse", label: "Browse papers" },
  { href: "/modules", label: "Modules" },
] as const;

/**
 * The landing header's links: inline on a wide screen, a drop-down behind a
 * menu button on a phone. The only client code the header needs.
 */
export function LandingMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="landing-header-links landing-links-inline" aria-label="Main">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        className="landing-burger"
        aria-label={open ? "Close the menu" : "Open the menu"}
        aria-expanded={open}
        aria-controls="landing-drawer"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <nav id="landing-drawer" className="landing-drawer" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
