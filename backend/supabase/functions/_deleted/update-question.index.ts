// ARCHIVED — deleted from Supabase on 2026-08-12. Do not redeploy.
// See README.md: service-role client + no admin check. Also wrote columns
// (uid, q_html, mark_scheme, exemplar_html, topic) dropped in 0002/0011.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIELD_MAP: Record<string, string> = {
  topic: "topic",
  marks: "marks",
  ref: "ref",
  qHTML: "q_html",
  markScheme: "mark_scheme",
  exemplarHTML: "exemplar_html",
  videoId: "video_id",
};

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
    const { uid, patch } = await req.json();
    if (!uid || !patch || typeof patch !== "object") {
      return new Response(
        JSON.stringify({ error: "uid and patch are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const row: Record<string, unknown> = {};
    for (const key of Object.keys(patch)) {
      const col = FIELD_MAP[key];
      if (col) row[col] = patch[key];
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("questions")
      .update(row)
      .eq("uid", uid)
      .select()
      .maybeSingle();
    if (error) throw error;

    return new Response(JSON.stringify({ question: data }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message || err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
