/* =====================================================================
   The question-images bucket's own rules, mirrored client-side.

   The bucket enforces these itself, so this is not the boundary — it is
   so a too-large photo fails with a sentence rather than a Postgres-ish
   error from Storage after the upload has already gone over the wire.
   Keep in step with the bucket's settings in the Supabase dashboard.
   ===================================================================== */
export const BUCKET = "question-images";

/** Matches the bucket's file size limit. */
export const MAX_FIGURE_BYTES = 5 * 1024 * 1024;

/**
 * Matches the bucket's allowed MIME types, SVG included.
 *
 * SVG can carry script, but it is only ever uploaded by an admin and only
 * ever drawn through <img>, where browsers do not execute it. A compromised
 * admin account can already write anything RLS allows, so excluding it here
 * would cost a legitimate format without closing anything.
 */
export const FIGURE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

/** The `accept` attribute for a file input, from the same list. */
export const FIGURE_ACCEPT = FIGURE_TYPES.join(",");

/** Throws with something worth reading, or returns. */
export function assertUploadableFigure(file: File): void {
  if (!FIGURE_TYPES.includes(file.type as (typeof FIGURE_TYPES)[number])) {
    throw new Error(`${file.name}: choose a PNG, JPG, GIF, WEBP or SVG.`);
  }
  if (file.size > MAX_FIGURE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new Error(`${file.name} is ${mb} MB. The limit is 5 MB.`);
  }
}
