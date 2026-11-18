"use client";

import { useEffect, useState } from "react";

import { getPaperKeysForTopic } from "@/lib/supabase";

export type TopicPapers = { keys: Set<string> | null; loading: boolean };

/**
 * Which papers contain a topic, for the shelf shown before results open.
 * Passing null (no topic, or results already showing) fetches nothing.
 * The result remembers what it was fetched for, so a slow answer for an
 * earlier topic is never mistaken for the current one.
 */
export function useTopicPapers(query: { subject: string; topic: string } | null): TopicPapers {
  const [result, setResult] = useState<{ id: string; keys: Set<string> } | null>(null);
  const id = query ? `${query.subject}\u0000${query.topic}` : null;
  const subject = query?.subject;
  const topic = query?.topic;

  useEffect(() => {
    if (!id || !subject || !topic) return;
    let alive = true;
    getPaperKeysForTopic(subject, topic).then(
      (keys) => alive && setResult({ id, keys }),
      (err) => {
        console.error("Browse: could not match papers to the topic:", err);
        if (alive) setResult({ id, keys: new Set() });
      },
    );
    return () => {
      alive = false;
    };
  }, [id, subject, topic]);

  const fresh = result && result.id === id ? result : null;
  return { keys: fresh?.keys ?? null, loading: Boolean(id) && !fresh };
}
