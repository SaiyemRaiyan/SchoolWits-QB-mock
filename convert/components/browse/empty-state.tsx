import { Card, CardContent } from "@/components/ui/card";

/** Used both as a prompt ("choose a subject") and as a no-results message. */
export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Card className="border-dashed shadow-none">
      <CardContent className="flex flex-col items-center gap-2 px-6 py-16 text-center">
        <span className="size-1.5 rounded-full bg-primary" />
        <h2 className="font-serif text-2xl font-semibold">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{children}</p>
      </CardContent>
    </Card>
  );
}
