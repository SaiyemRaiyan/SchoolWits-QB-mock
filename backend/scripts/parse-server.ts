#!/usr/bin/env node
/**
 * The new extractor on this machine, for trying it in the upload page.
 *
 *   npm run parse-server           (here, in backend/)
 *   npm run dev:new-parser         (at the repo root, in another terminal)
 *
 * Answers the same preview request as the parse-paper Edge Function. It has no
 * database access, so it cannot save anything.
 */

import { createServer } from 'node:http';
import { createExtractor } from '../src/extract/index.js';

const PORT = Number(process.env.PORT ?? 8787);
const MAX_BODY = 20_000_000;
// Only the local dev site may call it.
const ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

createServer((req, res) => {
  const origin = req.headers.origin ?? '';
  const send = (status: number, body: unknown) => {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      ...(ORIGIN.test(origin)
        ? {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Headers': 'content-type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
          }
        : null),
    });
    res.end(JSON.stringify(body));
  };
  if (req.method === 'OPTIONS') return send(200, {});
  if (req.method !== 'POST') return send(405, { error: 'POST only' });

  const chunks: Buffer[] = [];
  let size = 0;
  req.on('data', (chunk: Buffer) => {
    size += chunk.length;
    if (size > MAX_BODY) req.destroy();
    else chunks.push(chunk);
  });
  req.on('end', () => {
    try {
      const { qpTex, qaTex, images, commit } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (commit) return send(403, { error: 'Preview only: this parser cannot save.' });
      if (!qpTex) return send(400, { error: 'qpTex is required.' });

      const started = Date.now();
      const extractor = createExtractor({ questions: qpTex, answers: qaTex, images });
      const result = extractor.extract();
      const flagged = [...new Set(result.passes.map((p) => p.question))];
      console.log(
        `${result.paper?.paperId ?? 'no paper id'}  ${extractor.subject}  ${result.questions.length} questions  ` +
          `${flagged.length} flagged${flagged.length ? ` (${flagged.map((n) => `Q${n}`).join(', ')})` : ''}  ${Date.now() - started}ms`,
      );
      if (!result.paper) return send(422, { error: 'No paper id could be read from \\examq.', warnings: result.warnings });
      send(200, { ...result, committed: false });
    } catch (err) {
      console.error(err);
      send(500, { error: (err as Error).message });
    }
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`New extractor listening on http://localhost:${PORT}. Preview only. Stop it with Ctrl+C.`);
});
