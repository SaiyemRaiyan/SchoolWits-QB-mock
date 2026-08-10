import { describe, expect, it } from 'vitest';
import { inlineToHtml } from '../../src/latex/inline.js';

describe('inlineToHtml — math is never touched', () => {
  it('passes inline $...$ through verbatim', () => {
    expect(inlineToHtml('Solve $5x^2 - 10x \\ge 0$ now')).toBe('Solve $5x^2 - 10x \\ge 0$ now');
  });

  it('passes display \\[...\\] through verbatim', () => {
    const src = 'So \\[ R = \\sqrt{400^{2}} = \\boxed{410} \\] follows';
    expect(inlineToHtml(src)).toContain('\\[ R = \\sqrt{400^{2}} = \\boxed{410} \\]');
  });

  it('does not convert \\textbf inside math', () => {
    expect(inlineToHtml('$\\textbf{x}$')).toBe('$\\textbf{x}$');
  });

  it('handles $$ display math', () => {
    expect(inlineToHtml('a $$x+1$$ b')).toBe('a $$x+1$$ b');
  });
});

describe('inlineToHtml — prose', () => {
  it('converts font commands', () => {
    expect(inlineToHtml('mark \\textbf{one} point')).toBe('mark <strong>one</strong> point');
    expect(inlineToHtml('\\textit{aside}')).toBe('<em>aside</em>');
  });

  it('handles nested font commands', () => {
    expect(inlineToHtml('\\textbf{\\textit{x}}')).toBe('<strong><em>x</em></strong>');
  });

  it('escapes HTML so source cannot inject markup', () => {
    expect(inlineToHtml('a < b & c > d')).toBe('a &lt; b &amp; c &gt; d');
  });

  it('keeps an escaped ampersand as a single entity', () => {
    expect(inlineToHtml('Averages \\& Range')).toBe('Averages &amp; Range');
  });

  it('converts dashes and centred dots', () => {
    expect(inlineToHtml('speed--time')).toBe('speed–time');
    expect(inlineToHtml('A \\textperiodcentered\\ B')).toBe('A · B');
  });

  it('turns \\\\ into a line break', () => {
    expect(inlineToHtml('one\\\\two')).toBe('one<br>two');
    expect(inlineToHtml('one\\\\[4pt]two')).toBe('one<br>two');
  });

  it('renders \\pow as a superscript', () => {
    expect(inlineToHtml('N\\,/\\,m\\pow{2}')).toBe('N / m<sup>2</sup>');
  });

  it('drops unmodelled commands but keeps their text', () => {
    expect(inlineToHtml('\\uline{kept}')).toBe('kept');
  });
});
