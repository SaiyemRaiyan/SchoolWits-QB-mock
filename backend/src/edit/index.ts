/**
 * Public API for question editing.
 *
 * This is the bundle entry point for the `update-question` Edge Function
 * (`npm run build:edit-function`), which is why flattenQuestion is
 * re-exported here rather than imported from '../latex/index.js' inside the
 * function: the function gets exactly one generated file, the same way
 * parse-paper does.
 */

export { collectLeaves, applyEdits, addFigure, listFigureContainers, EditError } from './leaves.js';
export type { Leaf, Edit, FigureContainer, PathSegment } from './leaves.js';
export { flattenQuestion } from '../latex/flatten.js';
