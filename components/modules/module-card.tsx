"use client";

import { FileText, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Module } from "@/lib/supabase";

const FALLBACK_DESCRIPTION =
  "A focused set of past-paper questions on this topic, with full mark schemes and worked solutions.";

type ModuleCardProps = { module: Module; owned: boolean; onOpen: () => void };

/** One pack in the storefront grid. Flat surfaces, one accent: the price. */
export function ModuleCard({ module, owned, onOpen }: ModuleCardProps) {
  return (
    <Card className="group gap-0 py-0 transition-colors hover:border-primary/50">
      <CardHeader className="gap-2 p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
            {module.subject || "All subjects"}
          </p>
          <Badge variant={module.premium ? "default" : "secondary"} className="shrink-0">
            {module.premium ? "Premium" : "Free"}
          </Badge>
        </div>
        <h3 className="font-serif text-xl leading-snug font-semibold">{module.title}</h3>
        <div className="flex flex-wrap gap-1">
          {module.topics.slice(0, 3).map((topic) => (
            <Badge key={topic} variant="outline" className="font-normal">
              {topic}
            </Badge>
          ))}
          {module.topics.length > 3 && (
            <Badge variant="outline" className="font-normal">
              +{module.topics.length - 3}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-4">
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {module.description || FALLBACK_DESCRIPTION}
        </p>
      </CardContent>

      <Separator />

      <CardFooter className="flex-col items-stretch gap-3 p-5">
        <div className="flex items-baseline justify-between">
          <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <FileText className="size-3.5" />
            {module.questionUids.length} question{module.questionUids.length === 1 ? "" : "s"}
          </span>
          {owned ? (
            <span className="font-mono text-xs font-semibold text-muted-foreground uppercase">
              {module.premium ? "Owned" : "Free"}
            </span>
          ) : (
            <span className="font-serif text-xl font-bold text-primary">
              {module.currency}
              {module.price}
            </span>
          )}
        </div>
        <Button variant={owned ? "default" : "outline"} onClick={onOpen} className="w-full">
          {owned ? "Open module" : <><Lock className="size-3.5" />Preview</>}
        </Button>
      </CardFooter>
    </Card>
  );
}
