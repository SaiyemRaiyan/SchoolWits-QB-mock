import type { Facets } from "@/lib/supabase";

/**
 * The three numbers under the picker. Renders nothing until the counts
 * are in, rather than flashing three zeros.
 */
export function LandingStats({ facets }: { facets: Facets | null }) {
  if (!facets || !facets.paperCount) return <div className="landing-stats" />;

  return (
    <div className="landing-stats">
      <div className="landing-stat">
        <b>{facets.paperCount}</b>
        <span>Past papers</span>
      </div>
      <div className="landing-stat">
        <b>{facets.questionCount}</b>
        <span>Questions</span>
      </div>
      <div className="landing-stat">
        <b>{facets.topics.length}</b>
        <span>Topics</span>
      </div>
    </div>
  );
}
