import type { ContentBlock, FigureClip, QuestionContent, QuestionPart } from "@/lib/render/types";

export type PendingClip = { file: string; clip: FigureClip };

/**
 * Every figure the parser says is a region of the source PDF, once each.
 *
 * Figures in the answers file are not here: mark schemes and solutions
 * carry theirs as HTML, not as figure blocks.
 */
export function collectFigureClips(questions: QuestionContent[]): PendingClip[] {
  const found = new Map<string, FigureClip>();

  const visit = (blocks: ContentBlock[] = []) => {
    for (const block of blocks) {
      if (block.type === "figure" && block.clip && block.file) found.set(block.file, block.clip);
    }
  };
  const visitParts = (parts: QuestionPart[] = []) => {
    for (const part of parts) {
      visit(part.content);
      visitParts(part.subparts);
    }
  };

  for (const question of questions) {
    visit(question.stem);
    visitParts(question.parts);
  }
  return [...found].map(([file, clip]) => ({ file, clip }));
}
