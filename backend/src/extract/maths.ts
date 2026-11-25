/**
 * Mathematics (4037 Additional Mathematics, 4024 Mathematics D): the readers
 * for brackets, matrices, limits and relations belong here, added in front of
 * the shared ones through readers().
 */

import { PaperExtractor } from './paper-extractor.js';

export class MathsExtractor extends PaperExtractor {
  readonly subject = 'Mathematics';
}
