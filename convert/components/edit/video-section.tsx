"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extractYouTubeId, setVideoSource, type Question } from "@/lib/supabase";

const KINDS = { none: "No video", youtube: "YouTube", url: "Direct / bucket link" };

type VideoSectionProps = {
  question: Question;
  /** Set when editing a module's copy, which a video is not part of. */
  moduleId: number | null;
  onSaved: (question: Question) => void;
};

/**
 * A video is not a leaf: it lives in its own columns on `questions`, so it
 * has its own Save and is never module-scoped.
 */
export function VideoSection({ question, moduleId, onSaved }: VideoSectionProps) {
  const [kind, setKind] = useState(question.videoUrl ? "url" : question.videoId ? "youtube" : "none");
  const [youtube, setYoutube] = useState(question.videoId ?? "");
  const [url, setUrl] = useState(question.videoUrl);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setError("");
    let payload: { videoId: string; videoUrl: string };

    if (kind === "none") {
      payload = { videoId: "", videoUrl: "" };
    } else if (kind === "youtube") {
      const id = extractYouTubeId(youtube);
      if (!id) return setError("Not a valid YouTube URL or 11-character ID.");
      payload = { videoId: id, videoUrl: "" };
    } else {
      // The same rule as the column's check constraint, so a bad value is
      // refused here rather than coming back as a Postgres error.
      if (!/^https:\/\//.test(url.trim())) return setError("The video URL must start with https://");
      payload = { videoId: "", videoUrl: url.trim() };
    }

    setBusy(true);
    setStatus("Saving…");
    try {
      onSaved(await setVideoSource(question.uid, payload));
      setStatus(kind === "none" ? "Video removed." : "Video saved.");
    } catch (err) {
      setStatus("");
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-3">
      <Separator />
      <h3 className="text-sm font-medium">Video explanation</h3>

      {moduleId != null && (
        <p className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Shared.</strong> Unlike the fields above, a video
          belongs to the question itself. Changing it here changes it in the bank and in every other
          module using this question.
        </p>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="video-kind" className="text-xs text-muted-foreground">
          Source
        </Label>
        <Select items={KINDS} value={kind} onValueChange={(v) => setKind(String(v))}>
          <SelectTrigger id="video-kind" className="w-full sm:w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No video</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="url">Direct / bucket link</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {kind === "youtube" && (
        <div className="grid gap-1.5">
          <Label htmlFor="video-yt" className="text-xs text-muted-foreground">
            YouTube link or ID
          </Label>
          <Input
            id="video-yt"
            value={youtube}
            onChange={(e) => setYoutube(e.target.value)}
            placeholder="https://youtu.be/… or an 11-character ID"
          />
        </div>
      )}

      {kind === "url" && (
        <div className="grid gap-1.5">
          <Label htmlFor="video-url" className="text-xs text-muted-foreground">
            Direct video URL
          </Label>
          <Input
            id="video-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…/video.mp4"
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => void save()} disabled={busy}>
          Save video
        </Button>
        {status && <span className="text-xs text-muted-foreground">{status}</span>}
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </section>
  );
}
