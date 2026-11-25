/**
 * Mathematics (4037 Additional Mathematics, 4024 Mathematics D). Modulus bars,
 * roots and fractions are read by the shared readers (any paper may print
 * them). Readers for what only maths papers draw (matrices, limits, relations)
 * belong here, added with readers().
 */

import { PaperExtractor } from './paper-extractor.js';

export class MathsExtractor extends PaperExtractor {
  readonly subject = 'Mathematics';
}
