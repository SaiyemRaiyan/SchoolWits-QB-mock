/**
 * What a character code prints in the fonts the papers name by code.
 *
 * Symbol is the Adobe Symbol encoding, whole, so a code no paper has used yet
 * is still right. Pieces of tall brackets (E6 to FE) are given their Unicode
 * bracket-piece characters; the bracket reader puts them together.
 */

const run = (from: number, chars: string): [number, string][] =>
  [...chars].map((ch, i) => [from + i, ch] as [number, string]);

/** Adobe Symbol: \usefont{U}{psy}, \swsy{..}. */
const SYMBOL = new Map<number, string>([
  ...run(0x20, ' !∀#∃%&∋()∗+,−./0123456789:;<=>?≅ΑΒΧΔΕΦΓΗΙϑΚΛΜΝΟΠΘΡΣΤΥςΩΞΨΖ[∴]⊥_'),
  ...run(0x61, 'αβχδεφγηιϕκλμνοπθρστυϖωξψζ{|}∼'),
  ...run(0xa1, 'ϒ′≤⁄∞ƒ♣♦♥♠↔←↑→↓°±″≥×∝∂•÷≠≡≈…⏐⎯↵ℵℑℜ℘⊗⊕∅∩∪⊃⊇⊄⊂⊆∈∉∠∇®©™∏√⋅¬∧∨⇔⇐⇑⇒⇓◊〈®©™∑'),
  ...run(0xe6, '⎛⎜⎝⎡⎢⎣⎧⎨⎩⎪'),
  ...run(0xf1, '〉∫⌠⎮⌡⎞⎟⎠⎤⎥⎦⎫⎬⎭'),
]);

/** ZapfDingbats, as far as a question paper goes: ticks, crosses, dots. */
const DINGBATS = new Map<number, string>([
  [0x33, '✓'], [0x34, '✔'], [0x35, '✕'], [0x36, '✖'], [0x37, '✗'], [0x38, '✘'],
  [0x48, '★'], [0x6c, '●'], [0x6d, '❍'], [0x6e, '■'], [0x6f, '❏'],
]);

/** Text fonts by code: Windows Latin-1 above 7F, which the 8r fonts follow. */
const LATIN = new Map<number, string>([
  [0x85, '…'], [0x91, '‘'], [0x92, '’'], [0x93, '“'], [0x94, '”'], [0x95, '•'],
  [0x96, '–'], [0x97, '—'], [0xb0, '°'], [0xb1, '±'], [0xb5, 'μ'], [0xb7, '·'],
  [0xd7, '×'], [0xf7, '÷'], [0xa3, '£'],
]);

export function decode(code: number, family: string): string | null {
  if (family === 'symbol') return SYMBOL.get(code) ?? null;
  if (family === 'dingbats') return DINGBATS.get(code) ?? null;
  if (code >= 32 && code < 127) return String.fromCharCode(code);
  return LATIN.get(code) ?? null;
}

/** Commands that print one character, in any font. */
export const CHARACTERS: Record<string, string> = {
  textendash: '–', textemdash: '—', textminus: '−', texttimes: '×', textdiv: '÷', textpm: '±',
  textdegree: '°', textbullet: '•', textperiodcentered: '·', pounds: '£', textsterling: '£',
  ldots: '…', dots: '…', textellipsis: '…', textquoteright: '’', textquoteleft: '‘',
  textquotedblleft: '“', textquotedblright: '”', textquotedbl: '"', textmu: 'μ', textohm: 'Ω',
  textasciitilde: '~', textbackslash: '\\', textless: '<', textgreater: '>', textbar: '|',
  textunderscore: '_', textdollar: '$', S: '§', copyright: '©', textcelsius: '°C',
  ss: 'ß', o: 'ø', O: 'Ø', l: 'ł', ae: 'æ', aa: 'å',
};

/** Maths commands that are one character, when they stand alone. */
export const MATH_CHARACTERS: Record<string, string> = {
  times: '×', div: '÷', pm: '±', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠',
  rightarrow: '→', to: '→', rightleftharpoons: '⇌', infty: '∞', degree: '°', circ: '°', cdot: '·',
  bullet: '•', Omega: 'Ω', Delta: 'Δ', pi: 'π', mu: 'μ', theta: 'θ', lambda: 'λ', alpha: 'α',
  beta: 'β', gamma: 'γ', rho: 'ρ', approx: '≈', ldots: '…',
};

/** \"u, \'e: an accent, then the letter it sits on. */
const ACCENTS: Record<string, string> = { '"': '̈', "'": '́', '`': '̀', '^': '̂', '~': '̃', c: '̧' };

export function accented(accent: string, letter: string): string | null {
  const mark = ACCENTS[accent];
  return mark ? (letter + mark).normalize('NFC') : null;
}
