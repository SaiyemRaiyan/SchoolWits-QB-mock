/**
 * Figures cut out of the source exam paper PDF.
 *
 * Newer .tex files do not ship figure images. They clip a rectangle out of
 * the original paper: `\includegraphics[page=3, trim=l b r t, clip]{qp.pdf}`.
 * This module only READS that rectangle — the cutting happens in the
 * admin's browser (lib/pdf/), which uploads a PNG under the name clipKey()
 * gives it. The parser then resolves that name like any other figure file.
 */

export interface FigureClip {
  /** 1-based, as in \includegraphics[page=N]. Defaults to 1. */
  page: number;
  /** Trim in bp (= PDF points), measured in from each edge of the page. */
  left: number;
  bottom: number;
  right: number;
  top: number;
}

// Everything is normalised to bp because that is the PDF's own unit.
const TO_BP: Record<string, number> = {
  bp: 1,
  pt: 72 / 72.27,
  in: 72,
  mm: 72 / 25.4,
  cm: 72 / 2.54,
};

/** A TeX dimension -> bp. */
function toBp(raw: string): number | null {
  const m = /^(-?\d*\.?\d+)\s*([a-z]{2})?$/.exec(raw.trim());
  if (!m) return null;
  // graphicx treats unitless trim values as bp, unlike the rest of TeX.
  const factor = m[2] ? TO_BP[m[2]] : 1;
  if (factor === undefined) return null;
  return Number(m[1]) * factor;
}

/**
 * Reads page= and trim= out of a graphics option list.
 *
 * Null when neither is present, which is what keeps an old-style
 * `\qfig[0.42\linewidth]` width argument working untouched.
 */
export function parseClipOptions(optional: string | null): FigureClip | null {
  if (!optional) return null;

  let page: number | null = null;
  let trim: number[] | null = null;

  for (const piece of optional.split(',')) {
    const eq = piece.indexOf('=');
    if (eq === -1) continue;
    const key = piece.slice(0, eq).trim();
    const value = piece.slice(eq + 1).trim().replace(/^\{|\}$/g, '');

    if (key === 'page') {
      const n = Number(value);
      if (Number.isInteger(n) && n >= 1) page = n;
    } else if (key === 'trim') {
      const dims = value.split(/\s+/).filter(Boolean).map(toBp);
      if (dims.length === 4 && dims.every((d): d is number => d !== null)) trim = dims;
    }
  }

  if (page === null && trim === null) return null;
  const [left, bottom, right, top] = trim ?? [0, 0, 0, 0];
  return { page: page ?? 1, left, bottom, right, top };
}

/**
 * The filename a clip is uploaded and resolved under.
 *
 * Derived from the rectangle alone, so it is stable across re-parses and
 * the same picture used twice is stored once.
 */
export function clipKey(clip: FigureClip): string {
  const n = (v: number) => v.toFixed(2).replace('.', '_');
  return `p${clip.page}-${n(clip.left)}-${n(clip.bottom)}-${n(clip.right)}-${n(clip.top)}.png`;
}

/**
 * The PDF the .tex clips from, for the upload page's "drop this file" hint.
 * Looks for \newcommand{\srcpdf}{...} first, then any .pdf graphics argument.
 */
export function findSourcePdf(tex: string): string | null {
  const named = /\\(?:re)?newcommand\{?\\srcpdf\}?\{([^}]+)\}/.exec(tex);
  if (named) return named[1].trim();
  const used = /\\(?:includegraphics|qfig)\s*(?:\[[^\]]*\])?\s*\{([^}]+\.pdf)\}/i.exec(tex);
  return used ? used[1].trim() : null;
}
