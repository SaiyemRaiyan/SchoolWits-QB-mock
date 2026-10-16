"use client";

import { useRenderedMath } from "@/hooks/use-rendered-math";
import type { MarkSchemeDisplayRow } from "@/lib/render";

/** Part / expected answer / mark, with full-width banner rows for alternatives. */
export function MarkSchemeTable({ rows }: { rows: MarkSchemeDisplayRow[] }) {
  const ref = useRenderedMath([rows]);

  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No mark scheme uploaded for this question.
      </p>
    );
  }

  return (
    <div ref={ref} className="overflow-hidden rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[var(--sw-ink)] text-white">
            <Th className="w-24">Part</Th>
            <Th>Expected answer</Th>
            <Th className="w-20 text-center">Mark</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) =>
            row.isBanner ? (
              <tr key={i} className="bg-accent">
                <td
                  colSpan={3}
                  className="px-4 py-2 font-semibold text-accent-foreground"
                  dangerouslySetInnerHTML={{ __html: row.answer }}
                />
              </tr>
            ) : (
              <tr key={i} className="border-t even:bg-muted/40">
                <td className="px-4 py-3 align-top font-mono text-xs font-semibold whitespace-nowrap">
                  {row.part}
                </td>
                <td
                  className="px-4 py-3 align-top leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: row.answer }}
                />
                <td className="px-4 py-3 text-center align-top font-mono font-bold text-[var(--sw-marker)]">
                  {row.marks}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

function Th({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <th
      className={`px-4 py-3 text-left font-mono text-[10px] tracking-wider uppercase ${className ?? ""}`}
    >
      {children}
    </th>
  );
}
