import { Card, CardContent } from "@/components/ui/card";

type StepProps = {
  number?: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
};

/** One numbered stage of the builder. Flat card, no glow. */
export function Step({ number, title, hint, children }: StepProps) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="grid gap-3 p-5">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
            {number && (
              <span className="flex size-6 items-center justify-center rounded-full bg-primary font-mono text-xs text-primary-foreground">
                {number}
              </span>
            )}
            {title}
          </h2>
          {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
