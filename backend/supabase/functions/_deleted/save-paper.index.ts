// ARCHIVED — deleted from Supabase on 2026-08-12. Do not redeploy.
// See README.md: service-role client + no admin check meant anyone holding
// the public anon key could write arbitrary papers/questions. Replaced by
// ../parse-paper/, which uses the caller's client and checks is_admin().
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function paperKeyOf(meta: any): string {
  const slug = (s: any) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return [slug(meta.subject), meta.paper, meta.variant, slug(meta.session), meta.year].join('|');
}

function paperLabel(meta: any): string {
  return `${meta.subjectCode ? meta.subjectCode + '/' : ''}${meta.paper}${meta.variant}/${meta.session}/${String(meta.year).slice(-2)}`;
}

async function uploadImages(
  supabase: ReturnType<typeof createClient>,
  paperKey: string,
  images: Record<string, string>,
): Promise<Record<string, string>> {
  const urlMap: Record<string, string> = {};
  for (const [filename, dataUrl] of Object.entries(images || {})) {
    const match = /^data:([^;]+);base64,([\s\S]*)$/.exec(dataUrl || "");
    if (!match) continue;
    const [, contentType, base64Data] = match;
    const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const path = `${paperKey}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("question-images")
      .upload(path, bytes, { contentType, upsert: true });
    if (uploadError) throw uploadError;

    const { data: pub } = supabase.storage.from("question-images").getPublicUrl(
      path,
    );
    urlMap[filename] = pub.publicUrl;
  }
  return urlMap;
}

function swapImageUrls(
  html: string | undefined | null,
  images: Record<string, string>,
  urlMap: Record<string, string>,
): string | null {
  if (!html) return html ?? null;
  let out = html;
  for (const [filename, dataUrl] of Object.entries(images || {})) {
    const publicUrl = urlMap[filename];
    if (publicUrl && dataUrl && out.includes(dataUrl)) {
      out = out.split(dataUrl).join(publicUrl);
    }
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const { paperMeta, questions, images } = await req.json();
    if (!paperMeta || !Array.isArray(questions)) {
      return new Response(
        JSON.stringify({ error: "paperMeta and questions[] are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const paperKey = paperKeyOf(paperMeta);
    const paperRow = {
      paper_key: paperKey,
      subject: paperMeta.subject,
      subject_code: paperMeta.subjectCode || null,
      paper: paperMeta.paper,
      variant: paperMeta.variant,
      session: paperMeta.session,
      year: paperMeta.year,
      label: paperLabel(paperMeta),
    };

    const { data: savedPaper, error: paperError } = await supabase
      .from("papers")
      .upsert(paperRow)
      .select()
      .single();
    if (paperError) throw paperError;

    const urlMap = await uploadImages(supabase, paperKey, images || {});

    const questionRows = questions.map((q: any) => ({
      uid: `${paperKey}::${q.id}`,
      paper_key: paperKey,
      subject: paperMeta.subject,
      subject_code: paperMeta.subjectCode || null,
      paper: paperMeta.paper,
      variant: paperMeta.variant,
      session: paperMeta.session,
      year: paperMeta.year,
      topic: q.topic || "Uncategorised",
      question_number: q.id,
      ref: q.ref || `${paperLabel(paperMeta)} — Q${q.id}`,
      marks: q.marks || null,
      q_html: swapImageUrls(q.qHTML, images || {}, urlMap),
      mark_scheme: q.markScheme || [],
      exemplar_html: swapImageUrls(q.exemplarHTML, images || {}, urlMap),
      video_id: q.videoId || null,
    }));

    const { data: savedQuestions, error: qError } = await supabase
      .from("questions")
      .upsert(questionRows)
      .select();
    if (qError) throw qError;

    return new Response(
      JSON.stringify({ paper: savedPaper, questions: savedQuestions }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message || err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
