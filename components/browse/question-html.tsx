"use client";

import { useRenderedMath } from "@/hooks/use-rendered-math";
import { cn } from "@/lib/utils";

/** The only component allowed dangerouslySetInnerHTML: this is parser output,
    not user input, and every outside value already went through escapeHTML. */
export function QuestionHtml({ html, className }: { html: string; className?: string }) {
  const ref = useRenderedMath([html]);
  return <div ref={ref} className={cn(className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
