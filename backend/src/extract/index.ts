/**
 * The paper extractor's public face. See docs/paper-extractor.md.
 *
 *   createExtractor(source)  Factory: the class for the paper's syllabus code
 *   extractPaper(source)     createExtractor(source).extract()
 */

import { ChemistryExtractor } from './chemistry.js';
import { GenericExtractor } from './generic.js';
import { MathsExtractor } from './maths.js';
import { PaperExtractor, paperOf } from './paper-extractor.js';
import { PhysicsExtractor } from './physics.js';
import type { ExtractedPaper, PaperSource } from './types.js';

export type * from './types.js';
export { PaperExtractor, splitPaper, paperOf } from './paper-extractor.js';
export type { PaperDocument, QuestionDraft } from './paper-extractor.js';
export { PhysicsExtractor } from './physics.js';
export { ChemistryExtractor } from './chemistry.js';
export { MathsExtractor } from './maths.js';
export { GenericExtractor } from './generic.js';
export { SymbolTable, type KnownSymbol } from './symbols.js';
export { MacroTable } from './macros.js';
export { Typesetter } from './typesetter.js';
export { EquationChain } from './equations/chain.js';
export { PassOver, UNREAD } from './equations/pass.js';
export type { ReadingRules, QuestionSource, QuestionRead } from './questions.js';

type ExtractorClass = new (source: PaperSource) => PaperExtractor;

/** Syllabus code -> the class that reads it. Anything else is read by GenericExtractor. */
const SUBJECTS: Record<string, ExtractorClass> = {
  '5054': PhysicsExtractor,
  '5070': ChemistryExtractor,
  '4037': MathsExtractor,
  '4024': MathsExtractor,
};

/** Factory: picks the class from the paper code in the first \examq of the body. */
export function createExtractor(source: PaperSource): PaperExtractor {
  const code = paperOf(source)?.subjectCode ?? '';
  const Class = Object.hasOwn(SUBJECTS, code) ? SUBJECTS[code] : GenericExtractor;
  return new Class(source);
}

export function extractPaper(source: PaperSource): ExtractedPaper {
  return createExtractor(source).extract();
}
