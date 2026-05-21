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

const btnBase =
  "inline-flex min-h-11 items-center justify-center rounded-xl text-sm font-medium transition active:scale-[0.98]";

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
    previewCanvas.style.borderRadius = "6px";
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

  const applyPreset = (adjustments: Adjustments) =>
    setAdjustments(adjustments);

  const activePresetId = findMatchingPreset(adjustments)?.id;

  const handleDownload = async () => {
    if (pages.length === 0) return;
    setDownloading(true);
    setError(null);
    try {
      const adjusted = pages.map((p) =>
        renderAdjustedCanvas(p.canvas, adjustments),
      );
      await buildPdfFromCanvases(adjusted, fileName ?? "document.pdf");
    } catch {
      setError("Failed to generate PDF for download.");
    } finally {
      setDownloading(false);
    }
  };

  const hasPdf = pages.length > 0;

  const actionButtons = (
    <>
      <button
        type="button"
        onClick={resetAdjustments}
        className={`${btnBase} flex-1 border border-zinc-300 bg-white text-zinc-700 lg:flex-none lg:px-4`}
      >
        Reset
      </button>
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={downloading}
        className={`${btnBase} flex-[2] bg-zinc-900 text-white disabled:opacity-50 lg:flex-none lg:px-5`}
      >
        {downloading ? "Preparing…" : "Download PDF"}
      </button>
    </>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-100 text-zinc-900">
      <header className="safe-top shrink-0 border-b border-zinc-200 bg-white px-4 py-3 lg:px-6 lg:py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight lg:text-xl">
              Brightness PDF
            </h1>
            <p className="hidden text-sm text-zinc-500 sm:block">
              Adjust tone and color, preview live, download the result
            </p>
          </div>
          {hasPdf && (
            <div className="hidden shrink-0 items-center gap-2 lg:flex">
              {actionButtons}
            </div>
          )}
        </div>
      </header>

      <main
        className={`mx-auto w-full max-w-7xl flex-1 px-4 py-4 lg:p-6 ${hasPdf ? "pb-28 lg:pb-6" : ""}`}
      >
        {!hasPdf && (
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="flex min-h-[min(70dvh,520px)] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-white px-6 text-center transition active:bg-zinc-50 lg:min-h-[320px] lg:hover:border-zinc-400 lg:hover:bg-zinc-50"
          >
            <input
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={onInputChange}
              disabled={loading}
            />
            <span className="mb-3 text-5xl" aria-hidden>
              📄
            </span>
            <span className="text-base font-medium lg:text-lg">
              {loading ? "Loading PDF…" : "Tap to upload a PDF"}
            </span>
            <span className="mt-2 text-sm text-zinc-500">
              <span className="lg:hidden">
                Brightness, contrast, saturation & more
              </span>
              <span className="hidden lg:inline">
                Or drop a file here — brightness, contrast, saturation, and
                more
              </span>
            </span>
          </label>
        )}

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {hasPdf && (
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
            {/* Preview first on mobile */}
            <section className="min-w-0 lg:order-2 lg:flex-1">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    aria-label="Previous page"
                    className={`${btnBase} min-w-11 border border-zinc-300 bg-white px-3 disabled:opacity-40`}
                  >
                    ←
                  </button>
                  <span className="min-w-[7rem] text-center text-sm text-zinc-600">
                    {currentPage + 1} / {pages.length}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= pages.length - 1}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    aria-label="Next page"
                    className={`${btnBase} min-w-11 border border-zinc-300 bg-white px-3 disabled:opacity-40`}
                  >
                    →
                  </button>
                </div>
                <span className="text-xs text-zinc-500">Preview</span>
              </div>

              <div
                ref={previewRef}
                className="flex min-h-[38dvh] items-start justify-center overflow-auto rounded-2xl border border-zinc-200 bg-zinc-200/60 p-3 sm:min-h-[42dvh] lg:min-h-[480px] lg:p-6"
              />
            </section>

            <aside className="w-full shrink-0 rounded-2xl border border-zinc-200 bg-white p-4 lg:order-1 lg:w-80 lg:p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-medium text-zinc-700">
                  {fileName}
                </p>
                <label className="flex min-h-11 shrink-0 cursor-pointer items-center px-2 text-sm font-medium text-blue-600 active:opacity-70">
                  Replace
                  <input
                    type="file"
                    accept="application/pdf"
                    className="sr-only"
                    onChange={onInputChange}
                  />
                </label>
              </div>

              <div className="mb-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Presets
                </p>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.adjustments)}
                      className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition active:scale-[0.98] ${
                        activePresetId === preset.id
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                {ADJUSTMENT_LABELS.map(({ key, label, min, max }) => (
                  <div key={key} className="py-1">
                    <div className="mb-0 flex items-center justify-between text-sm">
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
                      aria-label={label}
                      className="range-touch w-full"
                    />
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}
      </main>

      {/* Sticky actions on mobile */}
      {hasPdf && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur-sm lg:hidden">
          <div className="mx-auto flex max-w-lg gap-2">{actionButtons}</div>
        </div>
      )}
    </div>
  );
}
