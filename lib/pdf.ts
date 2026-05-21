import { PDFDocument } from "pdf-lib";

export type PdfPage = {
  pageNumber: number;
  canvas: HTMLCanvasElement;
};

let pdfjsModule: typeof import("pdfjs-dist") | null = null;

async function getPdfJs() {
  if (!pdfjsModule) {
    pdfjsModule = await import("pdfjs-dist");
    pdfjsModule.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }
  return pdfjsModule;
}

export async function loadPdfPages(file: File): Promise<PdfPage[]> {
  const pdfjs = await getPdfJs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: PdfPage[] = [];
  const scale = 2;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    pages.push({ pageNumber: i, canvas });
  }

  return pages;
}

export async function buildPdfFromCanvases(
  canvases: HTMLCanvasElement[],
  fileName: string,
): Promise<void> {
  const doc = await PDFDocument.create();

  for (const canvas of canvases) {
    const pngData = canvas.toDataURL("image/png");
    const image = await doc.embedPng(pngData);
    const page = doc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }

  const bytes = await doc.save();
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.replace(/\.pdf$/i, "") + "-adjusted.pdf";
  link.click();
  URL.revokeObjectURL(url);
}
