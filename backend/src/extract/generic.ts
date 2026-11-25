/** Any subject without a class of its own: the shared rules alone. */

import { PaperExtractor } from './paper-extractor.js';

export class GenericExtractor extends PaperExtractor {
  readonly subject = 'Generic';
}
