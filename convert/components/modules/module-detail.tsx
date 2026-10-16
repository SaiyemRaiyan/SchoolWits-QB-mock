"use client";

import { Lock } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getModuleQuestions, type Module, type ModuleQuestion } from "@/lib/supabase";
import { cn } from "@/lib/utils";

import { QuestionPreview } from "./question-preview";

type ModuleDetailProps = { module: Module; owned: boolean; onUnlock: () => void };

/** The opened pack. Unowned premium packs show question one and blur the rest. */
export function ModuleDetail({ module, owned, onUnlock }: ModuleDetailProps) {
  const [questions, setQuestions] = useState<ModuleQuestion[] | null>(null);

  useEffect(() => {
    let alive = true;
    getModuleQuestions(module.id).then(
      (qs) => alive && setQuestions(qs),
      (err) => {
        console.error("Modules: could not load the pack:", err);
        if (alive) setQuestions([]);
      },
    );
    return () => {
      alive = false;
    };
  }, [module.id]);

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="gap-1 p-6 pb-4">
        <h2 className="font-serif text-2xl font-bold">{module.title}</h2>
        <p className="text-sm text-muted-foreground">
          {module.description || module.topicLabel} &middot; {module.questionUids.length} question
          {module.questionUids.length === 1 ? "" : "s"}
        </p>
      </CardHeader>
      <Separator />

      <CardContent className="relative p-6">
        {questions === null ? (
          <p className="text-sm text-muted-foreground">Loading questions…</p>
        ) : (
          <div className={cn("grid gap-8", !owned && "pointer-events-none")}>
            {questions.map((q, i) => (
              <div
                key={q.uid}
                className={cn(
                  "border-l-4 border-border pl-4",
                  !owned && i > 0 && "pointer-events-none blur-sm select-none",
                )}
              >
                <QuestionPreview question={q} />
              </div>
            ))}
          </div>
        )}

        {!owned && (
          <div className="absolute inset-x-6 bottom-6 rounded-xl border bg-card p-6 text-center shadow-lg">
            <Lock className="mx-auto size-5 text-primary" />
            <h3 className="mt-2 font-serif text-xl font-semibold">Unlock the full module</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The first question is open above as a preview. Unlock all{" "}
              {module.questionUids.length} for {module.currency}
              {module.price}.
            </p>
            <Button onClick={onUnlock} className="mt-4">
              Unlock {module.currency}
              {module.price}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
