import { describe, expect, it } from 'vitest';
import { clipKey, findSourcePdf, parseClipOptions } from '../../src/latex/clip.js';
import { toBlocks } from '../../src/latex/content.js';

const TRIM = 'page=3, trim=203.34bp 312.99bp 203.42bp 421.01bp, clip';

describe('parseClipOptions', () => {
  it('reads page and trim', () => {
    expect(parseClipOptions(TRIM)).toEqual({
      page: 3,
      left: 203.34,
      bottom: 312.99,
      right: 203.42,
      top: 421.01,
    });
  });

  it('accepts any key order, loose whitespace and a trailing comma', () => {
    expect(parseClipOptions(' clip ,trim = 1bp  2bp 3bp 4bp , page = 2 ,')).toEqual({
      page: 2,
      left: 1,
      bottom: 2,
      right: 3,
      top: 4,
    });
  });

  it('defaults to page 1 when only trim is given', () => {
    expect(parseClipOptions('trim=1bp 2bp 3bp 4bp, clip')?.page).toBe(1);
  });

  it('treats page without trim as the whole page', () => {
    expect(parseClipOptions('page=5')).toEqual({ page: 5, left: 0, bottom: 0, right: 0, top: 0 });
  });

  it('returns null for an old-style width argument', () => {
    expect(parseClipOptions('0.42\\linewidth')).toBeNull();
    expect(parseClipOptions('width=0.5\\linewidth')).toBeNull();
    expect(parseClipOptions(null)).toBeNull();
  });

  it('converts units to bp, and reads a bare number as bp like graphicx', () => {
    const clip = parseClipOptions('trim=72.27pt 1in 25.4mm 10');
    expect(clip?.left).toBeCloseTo(72);
    expect(clip?.bottom).toBeCloseTo(72);
    expect(clip?.right).toBeCloseTo(72);
    expect(clip?.top).toBe(10);
  });

  it('ignores a width key sitting beside the trim', () => {
    expect(parseClipOptions('width=0.6\\linewidth, page=2, trim=1bp 2bp 3bp 4bp')?.page).toBe(2);
  });

  it('accepts a braced trim', () => {
    expect(parseClipOptions('trim={1bp 2bp 3bp 4bp}')?.top).toBe(4);
  });
});

describe('clipKey', () => {
  it('is readable and stable', () => {
    const clip = parseClipOptions(TRIM)!;
    expect(clipKey(clip)).toBe('p3-203_34-312_99-203_42-421_01.png');
    expect(clipKey(clip)).toBe(clipKey({ ...clip }));
  });
});

describe('findSourcePdf', () => {
  it('prefers the \\srcpdf definition', () => {
    expect(findSourcePdf('\\newcommand{\\srcpdf}{5054_w25_qp_12.pdf}\n\\includegraphics{x.pdf}')).toBe(
      '5054_w25_qp_12.pdf',
    );
  });

  it('falls back to a .pdf graphics argument', () => {
    expect(findSourcePdf(`\\includegraphics[${TRIM}]{5054_w25_qp_12.pdf}`)).toBe('5054_w25_qp_12.pdf');
  });

  it('is null for a paper with ordinary figures', () => {
    expect(findSourcePdf('\\qfig[0.4\\linewidth]{fig1.png}{Fig. 1.1}')).toBeNull();
  });
});

describe('toBlocks with clipped figures', () => {
  it('names an \\includegraphics clip after its rectangle', () => {
    const [block] = toBlocks(`\\includegraphics[${TRIM}]{5054_w25_qp_12.pdf}`);
    expect(block).toMatchObject({
      type: 'figure',
      file: 'p3-203_34-312_99-203_42-421_01.png',
      src: null,
      width: null,
      clip: { page: 3 },
    });
  });

  it('resolves a clip through the image map like any other file', () => {
    const [block] = toBlocks(`\\qfig[${TRIM}]{\\srcpdf}{Fig. 1.1}`, {
      'p3-203_34-312_99-203_42-421_01.png': 'https://cdn/x.png',
    });
    expect(block).toMatchObject({ type: 'figure', src: 'https://cdn/x.png', caption: 'Fig. 1.1' });
  });

  it('leaves an old-style \\qfig exactly as it was', () => {
    expect(toBlocks('\\qfig[0.42\\linewidth]{fig1.png}{Fig. 1.1}')).toEqual([
      { type: 'figure', file: 'fig1.png', src: null, caption: 'Fig. 1.1', width: '0.42\\linewidth' },
    ]);
  });
});
