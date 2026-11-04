/* =====================================================================
   One import point for the data layer. Components import from
   "@/lib/supabase" and never reach into a file under it, so splitting or
   renaming a module below stays invisible to them.
   ===================================================================== */
export { supabase } from "./client";
export type {
  ContentBlock,
  MarkSchemeRow,
  Paper,
  Module,
  Question,
  QuestionContent,
  QuestionPart,
  SolutionSegment,
} from "./mappers";

export { deletePaper, getAllPapers, invalidatePaperCache } from "./papers";
export { getFacets, getTopicsForSubject, type Facets } from "./facets";
export {
  activePaperKey,
  getQuestionsByPaperKey,
  hasAnyFilter,
  paperKeyOf,
  paperLabel,
  searchQuestions,
  type SearchFilters,
} from "./questions";
export { currentUser, isAdmin, signInWithGoogle, signOut } from "./auth";
export { getAllQuestions } from "./questions";
export {
  addModuleQuestion,
  deleteModule,
  getAllModules,
  getModule,
  getModuleQuestions,
  isPurchased,
  markPurchased,
  saveModule,
  type ModuleQuestion,
  type SaveModuleInput,
} from "./modules";
export {
  getSyllabuses,
  invalidateSyllabusCache,
  type QualificationGroup,
  type Syllabus,
  type Syllabuses,
} from "./syllabuses";

import { invalidatePaperCache } from "./papers";
import { invalidateSyllabusCache } from "./syllabuses";

/**
 * Call after writing a paper. Both reference-data caches derive from the
 * same rows, so an admin would otherwise see their own upload missing.
 */
export function invalidateReferenceData() {
  invalidatePaperCache();
  invalidateSyllabusCache();
}
export {
  parsePaper,
  uploadFigures,
  type ParsedPaper,
  type ParsedQuestion,
  type ParseResult,
  type ParseWarning,
} from "./parse-paper";
export {
  extractYouTubeId,
  getQuestionLeaves,
  resetQuestionOverride,
  saveQuestionEdits,
  setVideoSource,
  uploadQuestionFigure,
  type EditResponse,
  type Leaf,
  type LeafKind,
} from "./edit";
