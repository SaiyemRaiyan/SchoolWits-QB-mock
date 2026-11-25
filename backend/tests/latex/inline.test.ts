import { describe, expect, it } from 'vitest';
import { countDiagrams, inlineToHtml } from '../../src/latex/inline.js';

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

  it('does not mistake the [4pt] of a \\\\ line break for display math', () => {
    // `\\[4pt]` is backslash-backslash then `[`. Reading the second
    // backslash as `\[` opens display math that swallows the rest of the
    // paragraph up to the next `\]`.
    const out = inlineToHtml('Heading $OCD$\\\\[4pt] \\textbf{Step 1} then \\[ x=1 \\] end');
    expect(out).toContain('<br>');
    expect(out).toContain('<strong>Step 1</strong>');
    expect(out).toContain('\\[ x=1 \\]');
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

describe('inlineToHtml — things that used to leak onto the page', () => {
  it('keeps a literal dollar out of any maths pairing', () => {
    // Bare `$` characters in one text node would be read as a $...$ pair.
    const out = inlineToHtml('costs \\$350 then \\$2 more');
    expect(out).toBe('costs <span>$</span>350 then <span>$</span>2 more');
  });

  it('leaves a \\$ inside real maths for KaTeX', () => {
    expect(inlineToHtml('so $\\$68$ total')).toBe('so $\\$68$ total');
  });

  it('turns itemize into a list and swallows its option block', () => {
    const out = inlineToHtml('\\begin{itemize}[leftmargin=2em,itemsep=2pt]\n\\item one\n\\item two\n\\end{itemize}');
    expect(out).toBe('<ul><li>one</li><li>two</li></ul>');
    expect(out).not.toContain('leftmargin');
  });

  it('numbers an enumerate and balances a list left open', () => {
    expect(inlineToHtml('\\begin{enumerate}\\item a')).toBe('<ol><li>a</li></ol>');
  });

  it('removes a tikzpicture entirely, coordinates and all', () => {
    const out = inlineToHtml('before \\begin{tikzpicture}[scale=0.7]\\draw (0,0) -- (1,1);\\end{tikzpicture} after');
    expect(out).toBe('before after');
    expect(countDiagrams('a \\begin{tikzpicture}x\\end{tikzpicture} b \\begin{tikzpicture}y\\end{tikzpicture}')).toBe(2);
  });
});

describe('inlineToHtml — environment markers', () => {
  it('does not leave an environment name behind', () => {
    expect(inlineToHtml('\\begin{center}centred text\\end{center}')).toBe('centred text');
    expect(inlineToHtml('a \\begin{minipage}{0.5\\textwidth}inside\\end{minipage} b')).toBe('a inside b');
  });

  it('leaves environments inside maths alone', () => {
    expect(inlineToHtml('$\\begin{pmatrix}1\\\\2\\end{pmatrix}$')).toBe('$\\begin{pmatrix}1\\\\2\\end{pmatrix}$');
  });
});

describe('inlineToHtml — printed answer blanks', () => {
  it('drops a makebox dotfill together with its width', () => {
    expect(inlineToHtml('x = \\makebox[2.6cm]{\\dotfill} , y')).toBe('x = , y');
  });
});

describe('inlineToHtml — control spaces', () => {
  it('turns a backslash-space into a plain space', () => {
    expect(inlineToHtml('i.e.\\ its ability and $x$\\ or $y$')).toBe('i.e. its ability and $x$ or $y$');
  });
});

describe('inlineToHtml — bare amsmath environments', () => {
  it('lifts align* as display maths instead of stripping its commands', () => {
    const out = inlineToHtml('Term by term:\n\\begin{align*}\n\\text{one} && a &= 1\\\\\nb &= 2\n\\end{align*}\nDone');
    expect(out).toContain('\\[\\begin{aligned}');
    expect(out).toContain('\\text{one} && a &= 1\\\\');
    expect(out).not.toContain('<br>');
  });
});
