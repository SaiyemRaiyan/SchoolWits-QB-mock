"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils";

type TiltProps = {
  children: React.ReactNode;
  className?: string;
  /** Maximum rotation in degrees. Big reading surfaces want a small number. */
  max?: number;
};

/**
 * Tilts its child toward the pointer, like a card on a desk. Only the pointer
 * position is read in script; the rotation itself is the .sw-tilt rule in
 * app/globals.css, which also switches off for reduced motion.
 */
export function Tilt({ children, className, max = 6 }: TiltProps) {
  const el = useRef<HTMLDivElement>(null);

  function move(e: React.PointerEvent<HTMLDivElement>) {
    const node = el.current;
    if (!node || e.pointerType === "touch") return;
    const r = node.getBoundingClientRect();
    node.dataset.active = "1";
    node.style.setProperty("--tx", String(((e.clientX - r.left) / r.width - 0.5) * 2));
    node.style.setProperty("--ty", String(((e.clientY - r.top) / r.height - 0.5) * 2));
  }

  function leave() {
    const node = el.current;
    if (!node) return;
    delete node.dataset.active;
    node.style.setProperty("--tx", "0");
    node.style.setProperty("--ty", "0");
  }

  return (
    <div
      ref={el}
      onPointerMove={move}
      onPointerLeave={leave}
      className={cn("sw-tilt", className)}
      style={{ ["--tilt" as string]: `${max}deg` }}
    >
      {children}
    </div>
  );
}
