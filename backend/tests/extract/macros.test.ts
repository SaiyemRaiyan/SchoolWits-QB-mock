/** The paper's own commands, read from the preamble. */

import { describe, expect, it } from 'vitest';
import { MacroTable } from '../../src/extract/macros.js';
import { CHEMISTRY, CHEMISTRY_MCQ, MATHS, PHYSICS, PHYSICS_MCQ } from './preambles.js';

const table = (tex: string) => MacroTable.fromPreamble(tex);
const squash = (s: string | undefined) => s?.replace(/\s+/g, '');

describe('macros: definitions of real papers', () => {
  it('reads a definition with arguments', () => {
    const at = table(MATHS).get('at')!;
    expect(at.args).toBe(3);
    expect(at.optional).toBeNull();
    expect(squash(at.body)).toBe(squash(String.raw`\rlap{\kern\dimexpr #1bp-49.6bp\relax\raisebox{#2bp}[0pt][0pt]{#3}}`));
  });

  it('reads each paper, not one paper: the same command differs between them', () => {
    expect(table(MATHS).get('pow')?.body).toContain('5.2bp');
    expect(table(PHYSICS).get('pow')?.body).toContain('3.86bp');
    expect(table(PHYSICS_MCQ).get('pow')?.body).toContain('4.98bp');
    expect(table(PHYSICS_MCQ).get('at')?.body).toContain('70.9bp');
  });

  it('reads an optional first argument and its default', () => {
    // \newcommand{\stack}[3][5.34/2.66/8]{...}
    expect(table(MATHS).get('stack')).toMatchObject({ args: 3, optional: '5.34/2.66/8' });
    // \newcommand{\swclip}[3][]{...}: an empty default is still a default
    expect(table(MATHS).get('swclip')).toMatchObject({ args: 3, optional: '' });
    expect(table(MATHS).get('pow')?.optional).toBeNull();
  });

  it('reads a definition with no arguments', () => {
    expect(table(PHYSICS).get('degC')).toMatchObject({ args: 0, body: String.raw`\dg C` });
    expect(table(CHEMISTRY).get('degC')).toMatchObject({ args: 0, body: String.raw`\textdegree C` });
  });

  it('reads \\def', () => {
    expect(table(MATHS).has('swdots')).toBe(true);
    expect(table(MATHS).get('swdots')?.args).toBe(0);
  });

  it('reads \\def with delimited arguments', () => {
    // \def\sw@stack#1/#2/#3\relax#4#5{...}
    const stack = table(MATHS).get('sw@stack')!;
    expect(stack.args).toBe(5);
    expect(stack.body).toContain('#5');
  });

  it('reads a command whose name is a sign', () => {
    // \AtBeginDocument{\renewcommand{\,}{\ifmmode\mskip\thinmuskip\else\kern1.59bp\relax\fi}}
    expect(table(CHEMISTRY_MCQ).get(',')?.body).toContain('1.59bp');
    expect(table(PHYSICS).get(',')?.body).toContain('1.53bp');
  });

  it('reads a definition that runs over several lines, dropping its comments', () => {
    // \newcommand{\ruleat}[4]{\rlap{...\relax⏎  \raisebox...
    const ruleat = table(MATHS).get('ruleat')!;
    expect(ruleat.args).toBe(4);
    expect(ruleat.body).toContain('#4bp/2');
    expect(table(MATHS).get('examq')?.body ?? '').not.toContain('%');
  });

  it('knows only what is defined', () => {
    expect(table(MATHS).has('swcut')).toBe(false);
    expect(table(CHEMISTRY).has('swcut')).toBe(true);
    expect(table(MATHS).get('nothing')).toBeUndefined();
    expect(table('').has('row')).toBe(false);
  });
});

describe('macros: the ways a definition can be written', () => {
  it.each([
    ['braces round the name', String.raw`\newcommand{\a}[1]{<#1>}`],
    ['no braces round the name', String.raw`\newcommand\a[1]{<#1>}`],
    ['a star', String.raw`\newcommand*{\a}[1]{<#1>}`],
    ['spaces between', '\\newcommand {\\a} [1] {<#1>}'],
    ['a line break between', '\\newcommand{\\a}[1]%\n  {<#1>}'],
    ['provide', String.raw`\providecommand{\a}[1]{<#1>}`],
    ['def', String.raw`\def\a#1{<#1>}`],
    ['gdef', String.raw`\gdef\a#1{<#1>}`],
    ['inside \\makeatletter', String.raw`\makeatletter\newcommand{\a}[1]{<#1>}\makeatother`],
  ])('%s', (_, tex) => expect(table(tex).get('a')).toMatchObject({ args: 1, optional: null, body: '<#1>' }));

  it('the last definition wins', () => {
    const t = table(String.raw`\newcommand{\a}{one}\renewcommand{\a}[1]{two #1}`);
    expect(t.get('a')).toMatchObject({ args: 1, body: 'two #1' });
  });

  it('a definition in a comment is not a definition', () => {
    expect(table('% \\newcommand{\\a}{one}\n').has('a')).toBe(false);
    expect(table('\\% \\newcommand{\\a}{one}').has('a')).toBe(true);
  });

  it('a name that begins with another name is its own command', () => {
    const t = table(String.raw`\newcommand{\row}[3]{r}\newcommand{\rowx}[1]{x}`);
    expect([t.get('row')?.args, t.get('rowx')?.args]).toEqual([3, 1]);
  });

  it('braces escaped inside a body do not end it', () => {
    expect(table(String.raw`\newcommand{\a}{\{x\}}\newcommand{\b}{y}`).get('b')?.body).toBe('y');
    expect(table(String.raw`\newcommand{\a}{\{x\}}`).get('a')?.body).toBe(String.raw`\{x\}`);
  });

  it('\\let copies what a command means at that moment', () => {
    const t = table(String.raw`\newcommand{\a}{one}\let\b\a \renewcommand{\a}{two}`);
    expect([t.get('a')?.body, t.get('b')?.body]).toEqual(['two', 'one']);
  });
});
