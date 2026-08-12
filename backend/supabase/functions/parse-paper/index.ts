/**
 * parse-paper — the ingest endpoint behind upload.html.
 *
 * The .tex parser runs here rather than in the browser so there is only one
 * copy of it. backend/src/latex/ has no dependencies and no node: imports
 * precisely so the same code runs unmodified under Deno.
 *
 * It is imported from vendor/latex.js, a GENERATED bundle of that folder
 * (`npm run build:function`). The bundle exists for two reasons: the
 * TypeScript sources use ".js" import specifiers that only resolve after a
 * compile step, and shipping one file keeps deploys from silently missing a
 * module. Never edit vendor/ — edit src/latex/ and rebuild.
 *
 * Two phases, both POSTs to this same endpoint:
 *
 *   { qpTex, qaTex, images }                 -> parse, return JSON + warnings
 *   { qpTex, qaTex, images, commit: true }   -> parse again, then write rows
 *
 * Commit re-parses instead of accepting JSON from the client. The parser is
 * deterministic so the result is identical, but it means the database can
 * only ever hold something the parser actually produced — a client cannot
 * post handcrafted `content`.
 *
 * Figures are NOT uploaded through here. The browser puts them in the
 * question-images bucket directly and passes { filename: publicUrl }; that
 * map is an INPUT to the parse, which is what lets \qfig resolve to a real
 * URL instead of being patched up afterwards. It also keeps request bodies
 * at ~45KB rather than megabytes.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  mergePaper,
  parseAnswerPaper,
  parseQuestionPaper,
} from './vendor/latex.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Flattened plain text for questions.search_vector — math is dropped. */
function flatten(q: any): string {
  const out: string[] = [];
  const blocks = (bs: any[] = []) => {
    for (const b of bs) {
      if (b.type === 'text') out.push(b.html);
      else if (b.type === 'figure' && b.caption) out.push(b.caption);
      else if (b.type === 'table') out.push(b.html);
    }
  };
  const parts = (ps: any[] = []) => {
    for (const p of ps) {
      blocks(p.content);
      parts(p.subparts);
    }
  };
  blocks(q.stem);
  parts(q.parts);
  for (const it of q.options?.items ?? []) out.push(it.content);
  for (const r of q.answer?.markScheme ?? []) out.push(r.answer);
  for (const s of q.answer?.workedSolution ?? []) {
    if (s.heading) out.push(s.heading);
    out.push(s.html);
  }
  return out
    .join(' ')
    .replace(/\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^$]*\$|\\\([\s\S]*?\\\)/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000);
}

/**
 * Recover the bucket object key from a public URL, so paper_images can be
 * recorded without the browser having to send the path separately.
 */
function storagePathFromUrl(url: string): string | null {
  const m = /\/object\/public\/question-images\/(.+)$/.exec(url);
  return m ? decodeURIComponent(m[1]) : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth) return json({ error: 'Missing Authorization header' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Acts as the caller, so auth.uid() inside is_admin() is their id and RLS
  // applies to them. verify_jwt only proves the token is valid — it says
  // nothing about whether this person may write papers.
  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: auth } },
  });

  const { data: isAdmin, error: adminError } = await asCaller.rpc('is_admin');
  if (adminError) return json({ error: `Admin check failed: ${adminError.message}` }, 500);
  if (!isAdmin) return json({ error: 'Admins only.' }, 403);

  let payload: {
    qpTex?: string;
    qaTex?: string;
    subject?: string;
    images?: Record<string, string>;
    commit?: boolean;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Body must be JSON.' }, 400);
  }

  const { qpTex, qaTex, subject, images = {}, commit = false } = payload;
  if (!qpTex) return json({ error: 'qpTex is required.' }, 400);

  const parsed = mergePaper(
    parseQuestionPaper(qpTex, images),
    qaTex
      ? parseAnswerPaper(qaTex, images)
      : { paper: null, byNumber: new Map(), warnings: [] },
  );

  if (!parsed.paper) {
    return json(
      {
        error:
          'No \\examq{...} headers found, or the paper id could not be read. ' +
          'See templates/README.md for the expected format.',
        warnings: parsed.warnings,
      },
      422,
    );
  }

  if (!commit) return json({ ...parsed, committed: false });

  // ---- commit -------------------------------------------------------------
  // Writes go through the caller's own client, so the admin-only RLS policies
  // are what authorise them. No service-role key is used here; a bug in this
  // function therefore cannot escalate past what the caller may already do.
  const meta = parsed.paper;
  const { data: paperRow, error: paperError } = await asCaller
    .from('papers')
    .upsert(
      {
        subject: subject || meta.subjectCode,
        subject_code: meta.subjectCode,
        paper: meta.paper,
        variant: meta.variant,
        session: meta.session,
        year: meta.year,
        label: `${meta.subjectCode}/${meta.paper}${meta.variant}/${meta.session}/${String(meta.year).slice(-2)}`,
      },
      { onConflict: 'paper_key' },
    )
    .select()
    .single();
  if (paperError) return json({ error: `Saving the paper failed: ${paperError.message}` }, 500);

  const rows = parsed.questions.map((q: any) => ({
    paper_id: paperRow.id,
    question_number: q.number,
    kind: q.kind,
    topics: q.topics,
    marks: q.marks,
    ref: `${meta.paperId} -- Q${q.number}`,
    q_text: flatten(q),
    content: q,
  }));

  // Upsert, not insert: re-uploading a paper to add its answers file later
  // is documented behaviour, and relies on (paper_id, question_number)
  // acting as an update target rather than a rejection.
  const { error: qError } = await asCaller
    .from('questions')
    .upsert(rows, { onConflict: 'paper_id,question_number' });
  if (qError) return json({ error: `Saving questions failed: ${qError.message}` }, 500);

  const imageRows = Object.entries(images)
    .map(([filename, publicUrl]) => {
      const path = storagePathFromUrl(publicUrl);
      return path
        ? { paper_id: paperRow.id, filename, storage_path: path, public_url: publicUrl }
        : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (imageRows.length) {
    const { error: imgError } = await asCaller
      .from('paper_images')
      .upsert(imageRows, { onConflict: 'storage_path' });
    // A figure that fails to be recorded is not worth losing the import
    // over — the URL is already inside content and will render. It only
    // costs the ability to clean the object up later, so it is reported
    // rather than thrown.
    if (imgError) parsed.warnings.push({ code: 'missing-image', message: imgError.message });
  }

  return json({
    ...parsed,
    committed: true,
    paperId: paperRow.id,
    questionCount: rows.length,
  });
});
