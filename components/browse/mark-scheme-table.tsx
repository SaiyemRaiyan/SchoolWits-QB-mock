"use client";

import { useRenderedMath } from "@/hooks/use-rendered-math";
import type { MarkSchemeDisplayRow } from "@/lib/render";

const LEGEND: Record<string, string> = {
  M: "method mark",
  A: "accuracy mark",
  B: "independent mark",
};

type Item =
  | { kind: "banner"; html: string }
  | { kind: "part"; part: string; rows: MarkSchemeDisplayRow[] };

/**
 * The examiner's grid, one box per part.
 *
 * The parser emits one row per mark, so a part worth three marks is three
 * rows that all say "1(c)". Read straight down a table that looks like three
 * different answers; grouped under one label it reads as one part with three
 * things to earn. Banner rows ("Alternative method") sit between boxes.
 */
export function MarkSchemeTable({ rows }: { rows: MarkSchemeDisplayRow[] }) {
  const ref = useRenderedMath([rows]);

  if (!rows.length) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No mark scheme has been uploaded for this question yet.
      </p>
    );
  }

  const items = group(rows);
  // Only explain the letters that actually appear on this question.
  const kinds = new Set(rows.flatMap((r) => codesOf(r.marks).map(kindOf)).filter(Boolean));

  return (
    <div ref={ref}>
      <div className="ms-sheet">
        <div className="ms-cols" aria-hidden>
          <span>Part</span>
          <span>Expected answer</span>
          <span>Marks</span>
        </div>

        {items.map((item, i) =>
          item.kind === "banner" ? (
            <div key={i} className="ms-banner" dangerouslySetInnerHTML={{ __html: item.html }} />
          ) : (
            <section key={i} className="ms-part" aria-label={item.part ? `Part ${item.part}` : "Answer"}>
              <div className="ms-gutter">
                <span className="ms-ref">{item.part || "Answer"}</span>
                {total(item.rows) != null && (
                  <span className="ms-total">
                    {total(item.rows)} {total(item.rows) === 1 ? "mark" : "marks"}
                  </span>
                )}
              </div>
              <div className="ms-rows">
                {item.rows.map((row, n) => (
                  <div key={n} className="ms-row">
                    <div className="ms-answer" dangerouslySetInnerHTML={{ __html: row.answer }} />
                    <div className="ms-marks">
                      <span className="ms-codes">
                        {codesOf(row.marks).map((code, k) => (
                          <span key={k} className="ms-code" data-kind={kindOf(code)}>
                            {code}
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ),
        )}
      </div>

      {kinds.size > 0 && (
        <p className="ms-legend">
          {[...kinds].map((k) => (
            <span key={k}>
              <span className="ms-code" data-kind={k}>
                {k}
              </span>
              {LEGEND[k as string]}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

/** Neighbouring rows for the same part share a box; a banner ends one. */
function group(rows: MarkSchemeDisplayRow[]): Item[] {
  const items: Item[] = [];
  for (const row of rows) {
    if (row.isBanner) {
      items.push({ kind: "banner", html: row.answer });
      continue;
    }
    const last = items.at(-1);
    if (last?.kind === "part" && last.part === row.part) last.rows.push(row);
    else items.push({ kind: "part", part: row.part, rows: [row] });
  }
  return items;
}

/** "M1 A1" or "B1, B1" -> one chip each. An empty cell yields none. */
function codesOf(marks: string): string[] {
  return marks
    .split(/[\s,;+]+/)
    .map((c) => c.trim())
    .filter(Boolean);
}

function kindOf(code: string): string {
  const letter = code[0]?.toUpperCase() ?? "";
  return letter in LEGEND ? letter : "";
}

/** The marks a part is worth: the number on the end of each code (B1 -> 1,
    M2 -> 2, a bare 3 -> 3). Null when a code carries no number to add up. */
function total(rows: MarkSchemeDisplayRow[]): number | null {
  let sum = 0;
  for (const row of rows) {
    for (const code of codesOf(row.marks)) {
      const n = /(\d+)$/.exec(code);
      if (!n) return null;
      sum += Number(n[1]);
    }
  }
  return sum || null;
}
