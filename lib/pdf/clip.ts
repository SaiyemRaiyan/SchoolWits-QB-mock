/* =====================================================================
   Cut a figure out of the source exam paper, in the browser.

   Newer .tex files clip their figures from the original PDF rather than
   shipping images. The parser reports each rectangle; this renders the
   page with pdf.js and crops it to a PNG the normal figure upload takes.
   ===================================================================== */
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";

import type { FigureClip } from "@/lib/render/types";

// ~288 dpi: sharp on a retina screen without making every crop a megabyte.
const SCALE = 4;
// Past this a canvas silently comes back blank in some browsers.
const MAX_PIXELS = 16_000_000;

export type PdfSource = {
  task: PDFDocumentLoadingTask;
  doc: PDFDocumentProxy;
  // Many figures share a page, so each page is rendered once per scale.
  pages: Map<string, Promise<HTMLCanvasElement>>;
};

/** pdf.js touches DOM globals on import, so it is loaded only when used. */
export async function openPdf(file: File): Promise<PdfSource> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
  return { task, doc: await task.promise, pages: new Map() };
}

export function closePdf(source: PdfSource): void {
  source.pages.clear();
  // The loading task owns the worker, so this is what releases it.
  void source.task.destroy();
}

function renderPage(source: PdfSource, pageNumber: number, scale: number) {
  const key = `${pageNumber}@${scale}`;
  let pending = source.pages.get(key);
  if (!pending) {
    pending = (async () => {
      const page = await source.doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      // Trim is measured on an upright page; a rotated one would crop the
      // wrong region without any sign that it had.
      if (viewport.rotation % 360 !== 0) {
        throw new Error(`Page ${pageNumber} of the PDF is rotated, so figures cannot be cut from it.`);
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      return canvas;
    })();
    source.pages.set(key, pending);
  }
  return pending;
}

/** One clip -> a PNG File named the way the parser will look it up. */
export async function cropToFile(source: PdfSource, clip: FigureClip, name: string): Promise<File> {
  if (clip.page > source.doc.numPages) {
    throw new Error(
      `A figure is on page ${clip.page}, but the PDF has ${source.doc.numPages} pages. Is it the right paper?`,
    );
  }

  // At scale 1 the viewport is in PDF points, the same unit as the trim.
  const page = await source.doc.getPage(clip.page);
  const { width, height } = page.getViewport({ scale: 1 });
  const w = width - clip.left - clip.right;
  const h = height - clip.top - clip.bottom;
  if (w <= 0 || h <= 0) {
    throw new Error(
      `The figure on page ${clip.page} has an empty trim rectangle ` +
        `(${clip.left} ${clip.bottom} ${clip.right} ${clip.top}).`,
    );
  }

  let scale = SCALE;
  while (scale > 1 && w * h * scale * scale > MAX_PIXELS) scale /= 2;

  const rendered = await renderPage(source, clip.page, scale);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not create a canvas to cut figures with.");

  // Canvas y runs down from the top, so the top trim is the y offset.
  context.drawImage(
    rendered,
    clip.left * scale,
    clip.top * scale,
    w * scale,
    h * scale,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/png"));
  if (!blob) throw new Error(`Could not encode the figure on page ${clip.page}.`);
  return new File([blob], name, { type: "image/png" });
}
