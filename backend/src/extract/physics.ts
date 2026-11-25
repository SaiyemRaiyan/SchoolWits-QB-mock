/**
 * Physics (5054). Everything a Physics paper prints so far (units, stacked
 * fractions, EITHER/OR) is read by the shared rules, so nothing is added here
 * yet: a Physics-only rule belongs in this class, anything else in the base.
 */

import { PaperExtractor } from './paper-extractor.js';

export class PhysicsExtractor extends PaperExtractor {
  readonly subject = 'Physics';
}
