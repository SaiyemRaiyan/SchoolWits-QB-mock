/**
 * The comparison has to be blind to how something is set and sharp about what
 * it says. If the second half of this file fails, no other test here means
 * anything.
 */

import { describe, expect, it, vi } from 'vitest';

// The helpers import the extractor; these tests are about the helpers alone.
vi.mock('../../src/extract/index.js', () => ({ extractPaper: () => null, createExtractor: () => null }));
const { canon, sentences } = await import('./helpers.js');

describe('canon: different ways of setting the same print are equal', () => {
  it.each([
    ['fraction commands', String.raw`$\dfrac{x+1}{2}$`, String.raw`$\frac{x + 1}{2}$`],
    ['tags and maths', 'C<sub>8</sub>H<sub>18</sub>', String.raw`$\mathrm{C}_{8}\mathrm{H}_{18}$`],
    ['a unicode power', 'x²', '$x^2$'],
    ['one-token scripts', '$x^2$', '$x^{2}$'],
    ['a minus or a hyphen key', '<em>x</em> − 3', '$x-3$'],
    ['italic or upright letters', '<em>p</em>', String.raw`$\mathrm{p}$`],
    ['growing brackets', String.raw`$\left(2-\dfrac{1}{4x}\right)^{5}$`, String.raw`$(2 - \frac{1}{4x})^5$`],
    ['modulus commands', String.raw`$\left|5x-3\right|$`, '|5<em>x</em> − 3|'],
    ['the order of two scripts', '<sup>19</sup><sub>9</sub>F', String.raw`${'$'}{}^{19}_{9}\mathrm{F}$`],
    ['a charge in one script or two', 'Fe<sup>3</sup><sup>+</sup>', String.raw`$\mathrm{Fe}^{3+}$`],
    ['a degree sign', '41°', String.raw`$41^{\circ}$`],
    ['a function name', 'sin <em>i</em>', String.raw`$\sin i$`],
    ['words in a fraction', String.raw`$\dfrac{\mathrm{mass\,of\,liquid}}{\mathrm{volume}}$`, String.raw`$\frac{\text{mass of liquid}}{\text{volume}}$`],
    ['a column vector', String.raw`$\begin{pmatrix}2\\y\end{pmatrix}$`, String.raw`$\left(\begin{array}{c} 2 \\ y \end{array}\right)$`],
    ['the l of chlorine', 'Cℓ', 'Cl'],
    ['bold', '<strong>a</strong> + <strong>b</strong>', String.raw`$\mathbf{a}+\mathbf{b}$`],
    ['an escaped less-than', 'a &lt; b', '$a < b$'],
    ['thin spaces', '24.0 g', '24.0 g'],
  ])('%s', (_, a, b) => expect(canon(a)).toBe(canon(b)));
});

describe('canon: anything that changes the meaning is kept', () => {
  it.each([
    ['a lost bracket', String.raw`$(x+q)^2$`, '$x+q^2$'],
    ['an unclosed bracket', '$(x+1)$', '$(x+1$'],
    ['a lost modulus bar', '$|5x-3|$', '$5x-3$'],
    ['half a modulus', '$|5x-3|$', '$|5x-3$'],
    ['a lost sign', '$-3x$', '$3x$'],
    ['a wrong sign', '$4-x$', '$4+x$'],
    ['a lost digit', '$12x$', '$2x$'],
    ['a lost power', '$x^2$', '$x2$'],
    ['a power made an index', '$x^2$', '$x_2$'],
    ['a power of a power flattened', '$b^{x^2}$', '$b^{x2}$'],
    ['a power on the wrong base', '$(2-x)^{5}$', '$(2-x^{5})$'],
    ['a fraction flattened', String.raw`$\frac{V}{I}$`, '$VI$'],
    ['a fraction turned over', String.raw`$\frac{V}{I}$`, String.raw`$\frac{I}{V}$`],
    ['a root lost', String.raw`$\sqrt{5}$`, '$5$'],
    ['a root reaching too far', String.raw`$\sqrt{5}x$`, String.raw`$\sqrt{5x}$`],
    ['the degree of a root', String.raw`$\sqrt[3]{y}$`, String.raw`$\sqrt{y}$`],
    ['a degree turned into a factor', String.raw`$\sqrt[3]{y}$`, String.raw`$3\sqrt{y}$`],
    ['strict and not strict', '$0<x$', String.raw`$0\leq x$`],
    ['another Greek letter', String.raw`$\theta$`, String.raw`$\pi$`],
    ['a formula run together', 'C<sub>8</sub>H<sub>18</sub>', 'C<sub>818</sub>H'],
    ['an arrow the wrong kind', String.raw`$\rightarrow$`, '⇌'],
    ['a charge lost', 'Na<sup>+</sup>', 'Na'],
    ['a charge on the line', 'Na<sup>+</sup>', 'Na+'],
    ['words run together', 'find the value', 'findthe value'],
    ['a word split by a kern', 'extension', 'e xtension'],
    ['a vector turned on its side', String.raw`$\begin{pmatrix}2\\y\end{pmatrix}$`, String.raw`$\begin{pmatrix}2&y\end{pmatrix}$`],
    ['an unknown command', '$x$', String.raw`$\mystery x$`],
    ['a leaked length', 'the speed', 'the 2.4bp speed'],
    ['case', '$P$', '$p$'],
  ])('%s', (_, a, b) => expect(canon(a)).not.toBe(canon(b)));
});

describe('sentences: spacing in prose is exact', () => {
  const text = (html: string) => sentences([{ type: 'text', html }]);
  it('joins spaces of any width but never invents or drops one', () => {
    expect(text('a force of 20 N')).toEqual(['a force of 20 N']);
    expect(text('a force of 20N')).not.toEqual(['a force of 20 N']);
    expect(text('experiment1')).not.toEqual(['experiment 1']);
  });
});
