import { describe, expect, it } from 'vitest';
import { parseOptions } from '../../src/latex/options.js';

// The four encodings the source papers actually use — templates/README.md,
// issue 1. `source` is what tells the upload UI which questions need their
// .tex fixing rather than silently losing options.
describe('parseOptions', () => {
  it('reads the \\begin{choices} environment', () => {
    const opts = parseOptions(`
\\begin{choices}
  \\item The coin has not hit the ground.
  \\item The weight equals the air resistance.
  \\item It is too heavy.
  \\item It is too small.
\\end{choices}`);
    expect(opts?.source).toBe('choices');
    expect(opts?.items.map((i) => i.label)).toEqual(['A', 'B', 'C', 'D']);
    expect(opts?.items[0].content).toContain('has not hit the ground');
  });

  it('reads the inline \\textbf{A}\\hspace form', () => {
    const opts = parseOptions(
      '\\textbf{A}\\hspace{0.6em}20\\,m\\hspace{1.6cm}\\textbf{B}\\hspace{0.6em}25\\,m' +
        '\\hspace{1.6cm}\\textbf{C}\\hspace{0.6em}30\\,m\\hspace{1.6cm}\\textbf{D}\\hspace{0.6em}40\\,m',
    );
    expect(opts?.source).toBe('inline');
    expect(opts?.items).toHaveLength(4);
    expect(opts?.items[0].content).toContain('20');
  });

  it('reads an A/B/C/D tabular', () => {
    const opts = parseOptions(`
\\begin{tabular}{|c|c|}
\\hline
\\textbf{A} & mass \\\\
\\hline
\\textbf{B} & weight \\\\
\\hline
\\end{tabular}`);
    expect(opts?.source).toBe('tabular');
    expect(opts?.items.map((i) => i.label)).toEqual(['A', 'B']);
  });

  it('reports figure-only options as unrecoverable rather than returning null', () => {
    const opts = parseOptions('Which graph shows their results?\n\\qfig[0.9\\linewidth]{fig3.png}{}');
    expect(opts).toEqual({ source: 'figure', items: [] });
  });

  it('does not mistake emphasis for an option list', () => {
    expect(parseOptions('mark \\textbf{one} point and \\textbf{two} others')).toBeNull();
  });

  it('does not mistake a stem data table for options', () => {
    expect(
      parseOptions('\\begin{tabular}{|c|c|}\\hline mass & 4 \\\\ \\hline volume & 2 \\\\ \\hline\\end{tabular}'),
    ).toBeNull();
  });
});
