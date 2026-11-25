import { flow } from '../flow.js';
import { isComposite, unresolved } from './geometry.js';
import type { EquationReader, Line, Reading } from '../types.js';

/** Text, typed maths and their raised and lowered small print. */
export class TextAndScripts implements EquationReader {
  readonly name = 'scripts';

  read(line: Line): Reading | null {
    if (line.pieces.some(unresolved)) return null;
    const read = flow(line);
    if (read.ambiguous) return null;
    const failed = line.pieces.find((p) => isComposite(p) && p.failed);
    if (failed && isComposite(failed)) return { ok: false, reason: failed.failed!.reason, tex: read.tex };
    return { ok: true, tex: read.tex, rebuilt: read.rebuilt };
  }
}
