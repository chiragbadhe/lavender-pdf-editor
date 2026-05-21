"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ADJUSTMENT_LABELS,
  DEFAULT_ADJUSTMENTS,
  type Adjustments,
  renderAdjustedCanvas,
} from "@/lib/adjustments";
import { buildPdfFromCanvases, loadPdfPages, type PdfPage } from "@/lib/pdf";
import { findMatchingPreset, PRESETS } from "@/lib/presets";

export default function PdfEditor() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [adjustments, setAdjustments] = useState<Adjustments>(
    DEFAULT_ADJUSTMENTS,
  );
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const currentSource = pages[currentPage]?.canvas;

  const previewCanvas = useMemo(() => {
    if (!currentSource) return null;
    return renderAdjustedCanvas(currentSource, adjustments);
  }, [currentSource, adjustments]);

  useEffect(() => {
    const container = previewRef.current;
    if (!container || !previewCanvas) return;
    container.replaceChildren(previewCanvas);
    previewCanvas.style.maxWidth = "100%";
    previewCanvas.style.height = "auto";
    previewCanvas.style.display = "block";
    previewCanvas.style.margin = "0 auto";
    previewCanvas.style.borderRadius = "4px";
    previewCanvas.style.boxShadow = "0 1px 3px rgba(0,0,0,0.12)";
  }, [previewCanvas]);

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    setError(null);
    setLoading(true);
    setFileName(file.name);
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setCurrentPage(0);
    try {
      const loaded = await loadPdfPages(file);
      if (loaded.length === 0) {
        setError("Could not read any pages from this PDF.");
        setPages([]);
        return;
      }
      setPages(loaded);
    } catch {
      setError("Failed to load PDF. The file may be corrupted or encrypted.");
      setPages([]);
      setFileName(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const updateAdjustment = (key: keyof Adjustments, value: number) => {
    setAdjustments((prev) => ({ ...prev, [key]: value }));
  };

  const resetAdjustments = () => setAdjustments(DEFAULT_ADJUSTMENTS);

  const applyPreset = (adjustments: Adjustments) => setAdjustments(adjustments);

  const activePresetId = findMatchingPreset(adjustments)?.id;

  const handleDownload = async () => {
    if (pages.length === 0) return;
    setDownloading(true);
    setError(null);
    try {
      const adjusted = pages.map((p) =>
        renderAdjustedCanvas(p.canvas, adjustments),
      );
      await buildPdfFromCanvases(
        adjusted,
        fileName ?? "document.pdf",
      );
    } catch {
      setError("Failed to generate PDF for download.");
    } finally {
      setDownloading(false);
    }
  };

  const hasPdf = pages.length > 0;

  return (
    <div className="min-h-full bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Brightness PDF
            </h1>
            <p className="text-sm text-zinc-500">
              Adjust tone and color, preview live, download the result
            </p>
          </div>
          {hasPdf && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={resetAdjustments}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={downloading}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
              >
                {downloading ? "Preparing…" : "Download PDF"}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6">
        {!hasPdf && (
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-white transition hover:border-zinc-400 hover:bg-zinc-50"
          >
            <input
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={onInputChange}
              disabled={loading}
            />
            <span className="mb-2 text-4xl">📄</span>
            <span className="text-lg font-medium">
              {loading ? "Loading PDF…" : "Drop a PDF here or click to upload"}
            </span>
            <span className="mt-1 text-sm text-zinc-500">
              Brightness, contrast, saturation, exposure, and more
            </span>
          </label>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {hasPdf && (
          <div className="flex flex-col gap-6 lg:flex-row">
            <aside className="w-full shrink-0 rounded-2xl border border-zinc-200 bg-white p-5 lg:w-80">
              <div className="mb-4 flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-zinc-700">
                  {fileName}
                </p>
                <label className="shrink-0 cursor-pointer text-xs font-medium text-blue-600 hover:underline">
                  Replace
                  <input
                    type="file"
                    accept="application/pdf"
                    className="sr-only"
                    onChange={onInputChange}
                  />
                </label>
              </div>

              <div className="space-y-5">
                {ADJUSTMENT_LABELS.map(({ key, label, min, max }) => (
                  <div key={key}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium">{label}</span>
                      <span className="tabular-nums text-zinc-500">
                        {adjustments[key] > 0 ? "+" : ""}
                        {adjustments[key]}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      value={adjustments[key]}
                      onChange={(e) =>
                        updateAdjustment(key, Number(e.target.value))
                      }
                      className="h-2 w-full cursor-pointer accent-zinc-900"
                    />
                  </div>
                ))}
              </div>
            </aside>

            <section className="min-w-0 flex-1">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    ←
                  </button>
                  <span className="text-sm text-zinc-600">
                    Page {currentPage + 1} of {pages.length}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= pages.length - 1}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    →
                  </button>
                </div>
                <span className="text-xs text-zinc-500">Live preview</span>
              </div>

              <div
                ref={previewRef}
                className="overflow-auto rounded-2xl border border-zinc-200 bg-zinc-200/60 p-6"
                style={{ minHeight: 480 }}
              />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
