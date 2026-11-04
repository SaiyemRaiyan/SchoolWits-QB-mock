import type { Question } from "@/lib/supabase";

/** video_url wins over video_id when both are set, as migration 0019 documents. */
export function VideoPanel({ question }: { question: Question }) {
  const title = `Video explanation for Question ${question.id}`;

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
      {question.videoUrl ? (
        <video src={question.videoUrl} title={title} controls preload="metadata" className="size-full" />
      ) : (
        <iframe
          src={`https://www.youtube.com/embed/${question.videoId}`}
          title={title}
          allowFullScreen
          loading="lazy"
          className="size-full"
        />
      )}
    </div>
  );
}
