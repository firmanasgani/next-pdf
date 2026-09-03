'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import FileUpload from '@/components/FileUpload';
import MergeFileOrganizer, { MergeFileEntry } from '@/components/MergeFileOrganizer';
import WhatsNewModal from '@/components/WhatsNewModal';
import SupportBanner from '@/components/SupportBanner';
import {
  Tool,
  Quality,
  ConversionQuality,
  toolConfig,
  toolGroups,
  qualityMeta,
} from '@/lib/tools';
import styles from './workspace.module.css';

const PDFEditor = dynamic(() => import('@/components/PDFEditor'), {
  ssr: false,
  loading: () => <div className={styles.loading}>Loading PDF Editor...</div>,
});

const PDFAnnotator = dynamic(() => import('@/components/PDFAnnotator'), {
  ssr: false,
  loading: () => <div className={styles.loading}>Loading PDF Annotator...</div>,
});

const ImageEditor = dynamic(() => import('@/components/ImageEditor'), {
  ssr: false,
  loading: () => <div className={styles.loading}>Loading Image Editor...</div>,
});

const BackgroundRemover = dynamic(() => import('@/components/BackgroundRemover'), {
  ssr: false,
  loading: () => <div className={styles.loading}>Loading Background Remover...</div>,
});

// ─────────────────────────────────────────────────────────────────────────────
// Component — one tool per URL. The parent route passes `key={tool}` so this
// remounts (and resets all local state) whenever the module changes.
// ─────────────────────────────────────────────────────────────────────────────

export default function ToolWorkspace({ tool }: { tool: Tool }) {
  const selectedTool = tool;

  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showAnnotator, setShowAnnotator] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [showBgRemover, setShowBgRemover] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Compress options
  const [quality, setQuality] = useState<Quality>('ebook');

  // Split options
  const [splitMode, setSplitMode] = useState<'all' | 'range'>('all');
  const [ranges, setRanges] = useState<{ start: number; end: number }[]>([{ start: 1, end: 1 }]);

  // Merge file ordering + page ranges
  const [mergeEntries, setMergeEntries] = useState<MergeFileEntry[]>([]);

  // PDF → Word conversion quality result
  const [conversionScore, setConversionScore] = useState<number | null>(null);
  const [conversionQuality, setConversionQuality] = useState<ConversionQuality | null>(null);
  const [conversionNotes, setConversionNotes] = useState<string>('');

  // ── File selection ─────────────────────────────────────────────────────────

  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setError(null);
    setSuccess(null);
    setConversionScore(null);
    setConversionQuality(null);
    setConversionNotes('');

    if (selectedTool === 'merge') {
      setMergeEntries(
        selectedFiles.map((file, i) => ({
          id: `${file.name}-${file.size}-${i}-${Date.now()}`,
          file,
          pageRange: '',
        })),
      );
    }
  }, [selectedTool]);

  // ── Download helper ────────────────────────────────────────────────────────

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // ── Generic request handler ────────────────────────────────────────────────

  const processRequest = async (url: string, formData: FormData, filename: string) => {
    const response = await fetch(url, { method: 'POST', body: formData });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Processing failed');
    }

    const blob = await response.blob();
    downloadBlob(blob, filename);
    setSuccess('File processed successfully!');
    setFiles([]);
  };

  // ── PDF → Word handler (reads custom response headers) ────────────────────

  const processPdfToWord = async () => {
    if (files.length > 20) {
      throw new Error('Maximum 20 files allowed for PDF to Word conversion');
    }

    let lastScore = 0;
    let lastQuality: ConversionQuality = 'fair';
    let lastNotes = '';

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/pdf-to-word', { method: 'POST', body: formData });

      if (!response.ok) {
        let errorMessage = `Server error (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          if (response.status === 413) errorMessage = 'File too large to process';
          else if (response.status === 429) errorMessage = 'Too many requests, please wait and try again';
          else if (response.status >= 500) errorMessage = 'Conversion service unavailable, please try again later';
        }
        throw new Error(`${file.name}: ${errorMessage}`);
      }

      lastScore = parseInt(response.headers.get('X-Conversion-Score') ?? '0', 10);
      lastQuality = (response.headers.get('X-Conversion-Quality') ?? 'fair') as ConversionQuality;
      lastNotes = response.headers.get('X-Conversion-Notes') ?? '';

      const blob = await response.blob();
      const outputName = file.name.replace(/\.pdf$/i, '.docx');
      downloadBlob(blob, outputName);
    }

    setConversionScore(lastScore);
    setConversionQuality(lastQuality);
    setConversionNotes(lastNotes);
    setSuccess(files.length > 1 ? `${files.length} files exported successfully!` : 'Export successful!');
    setFiles([]);
  };

  // ── Main process dispatcher ────────────────────────────────────────────────

  const handleProcess = async () => {
    const activeFiles = selectedTool === 'merge' ? mergeEntries.map((e) => e.file) : files;

    if (activeFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setConversionScore(null);
    setConversionQuality(null);
    setConversionNotes('');

    try {
      const formData = new FormData();

      if (selectedTool === 'merge') {
        mergeEntries.forEach((entry) => formData.append('files', entry.file));
        formData.append('pageRanges', JSON.stringify(mergeEntries.map((e) => e.pageRange)));
        await processRequest('/api/merge', formData, 'merged.pdf');
        setMergeEntries([]);
      } else if (selectedTool === 'compress') {
        formData.append('file', files[0]);
        formData.append('quality', quality);
        await processRequest('/api/compress', formData, 'compressed.pdf');
      } else if (selectedTool === 'split') {
        formData.append('file', files[0]);
        formData.append('mode', splitMode);
        if (splitMode === 'range') formData.append('ranges', JSON.stringify(ranges));
        await processRequest('/api/split', formData, splitMode === 'all' ? 'split_pdfs.zip' : 'split.pdf');
      } else if (selectedTool === 'pdf-to-word') {
        await processPdfToWord();
      } else if (selectedTool === 'word-to-pdf') {
        formData.append('file', files[0]);
        await processRequest('/api/word-to-pdf', formData, files[0].name.replace(/\.[^.]+$/, '.pdf'));
      } else if (selectedTool === 'image-to-pdf') {
        files.forEach((file) => formData.append('files', file));
        await processRequest('/api/image-to-pdf', formData, 'converted.pdf');
      } else if (selectedTool === 'ppt-to-pdf') {
        formData.append('file', files[0]);
        await processRequest('/api/ppt-to-pdf', formData, files[0].name.replace(/\.[^.]+$/, '.pdf'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // ── Editor / annotator ─────────────────────────────────────────────────────

  const handleEditorSave = async (operations: {
    pagesToDelete: number[];
    rotations: { page: number; rotation: 90 | 180 | 270 }[];
    reorder?: number[];
  }) => {
    setShowEditor(false);
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('operations', JSON.stringify(operations));
      await processRequest('/api/modify', formData, 'modified.pdf');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditor = () => {
    if (files.length === 0) { setError('Please select a PDF file first'); return; }
    setShowEditor(true);
    setError(null);
    setSuccess(null);
  };

  const handleOpenAnnotator = () => {
    if (files.length === 0) { setError('Please select a PDF file first'); return; }
    setShowAnnotator(true);
    setError(null);
    setSuccess(null);
  };

  const handleAnnotatorSave = (blob: Blob) => {
    setShowAnnotator(false);
    downloadBlob(blob, `annotated_${files[0]?.name ?? 'document.pdf'}`);
    setSuccess('PDF berhasil disimpan dengan anotasi!');
    setFiles([]);
  };

  const handleOpenImageEditor = () => {
    if (files.length === 0) { setError('Please select an image file first'); return; }
    setShowImageEditor(true);
    setError(null);
    setSuccess(null);
  };

  const handleImageEditorSave = (blob: Blob, filename: string) => {
    setShowImageEditor(false);
    downloadBlob(blob, filename);
    setSuccess('Image edited successfully!');
    setFiles([]);
  };

  const handleOpenBgRemover = () => {
    if (files.length === 0) { setError('Please select an image file first'); return; }
    setShowBgRemover(true);
    setError(null);
    setSuccess(null);
  };

  const handleBgRemoverDone = (blob: Blob, filename: string) => {
    setShowBgRemover(false);
    downloadBlob(blob, filename);
    setSuccess('Background removed successfully!');
    setFiles([]);
  };

  // ── Split helpers ──────────────────────────────────────────────────────────

  const addRange = () => setRanges([...ranges, { start: 1, end: 1 }]);
  const removeRange = (index: number) => setRanges(ranges.filter((_, i) => i !== index));
  const updateRange = (index: number, field: 'start' | 'end', value: number) => {
    const newRanges = [...ranges];
    newRanges[index][field] = value;
    setRanges(newRanges);
  };

  // ── Derived state ──────────────────────────────────────────────────────────

  const cfg = toolConfig[selectedTool];
  const isConvertToPdf = ['word-to-pdf', 'image-to-pdf', 'ppt-to-pdf'].includes(selectedTool);
  const isExportTool = selectedTool === 'pdf-to-word';

  const isDisabled =
    loading ||
    (selectedTool === 'merge' ? mergeEntries.length === 0 : files.length === 0);

  const getButtonLabel = () => {
    if (loading) return null;
    if (selectedTool === 'modify') return 'Open Editor';
    if (selectedTool === 'annotate') return 'Open Annotator';
    if (selectedTool === 'image-edit') return 'Open Image Editor';
    if (selectedTool === 'remove-bg') return 'Remove Background';
    if (isExportTool) return 'Export to Word';
    if (isConvertToPdf) return 'Convert to PDF';
    return 'Process PDF';
  };

  const getButtonAction = () => {
    if (selectedTool === 'modify') return handleOpenEditor;
    if (selectedTool === 'annotate') return handleOpenAnnotator;
    if (selectedTool === 'image-edit') return handleOpenImageEditor;
    if (selectedTool === 'remove-bg') return handleOpenBgRemover;
    return handleProcess;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className={styles.navbar}>
        <button
          className={styles.hamburger}
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Link href="/" className={styles.logo}>
          <span className={styles.logoMark}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </span>
          <span className={styles.logoText}>NextPDF</span>
        </Link>

        <div className={styles.navCurrentTool}>
          <span className={styles.navToolIcon}>{cfg.icon}</span>
          <span className={styles.navToolLabel}>{cfg.label}</span>
        </div>
      </nav>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className={styles.body}>
        {sidebarOpen && (
          <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarHeader}>
            <Link href="/" className={styles.sidebarLogo}>
              <span className={styles.logoMark}>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </span>
              <span className={styles.sidebarLogoText}>NextPDF</span>
            </Link>
            <button
              className={styles.sidebarClose}
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className={styles.sidebarNav}>
            {toolGroups.map((group) => (
              <div key={group.label} className={styles.toolGroup}>
                <p className={styles.toolGroupLabel}>{group.label}</p>
                {group.tools.map((t) => (
                  <Link
                    key={t}
                    href={`/tools/${t}`}
                    className={`${styles.sidebarToolButton} ${selectedTool === t ? styles.sidebarToolActive : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className={styles.sidebarToolIcon}>{toolConfig[t].icon}</span>
                    <span className={styles.sidebarToolLabel}>{toolConfig[t].label}</span>
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <main className={styles.main}>
          {showBgRemover && files.length > 0 ? (
            <BackgroundRemover
              file={files[0]}
              onDone={handleBgRemoverDone}
              onCancel={() => setShowBgRemover(false)}
            />
          ) : showImageEditor && files.length > 0 ? (
            <ImageEditor
              file={files[0]}
              onSave={handleImageEditorSave}
              onCancel={() => setShowImageEditor(false)}
            />
          ) : showAnnotator && files.length > 0 ? (
            <PDFAnnotator
              file={files[0]}
              onSave={handleAnnotatorSave}
              onCancel={() => setShowAnnotator(false)}
            />
          ) : showEditor && files.length > 0 ? (
            <PDFEditor
              file={files[0]}
              onSave={handleEditorSave}
              onCancel={() => setShowEditor(false)}
            />
          ) : (
            <div className={styles.content}>
              {/* Tool header */}
              <div className={styles.toolHeader}>
                <div className={styles.toolHeaderIcon}>{cfg.icon}</div>
                <div>
                  <h2 className={styles.toolTitle}>{cfg.label}</h2>
                  <p className={styles.toolDescription}>{cfg.description}</p>
                </div>
              </div>

              {/* File upload zone */}
              <FileUpload
                multiple={cfg.multiple}
                onFilesSelected={handleFilesSelected}
                accept={cfg.accept}
                maxFiles={cfg.maxFiles}
                fileTypeLabel={cfg.fileTypeLabel}
                showFileList={selectedTool !== 'merge'}
              />

              {/* ── Merge: file organizer (order + page ranges) ──────────── */}
              {selectedTool === 'merge' && mergeEntries.length > 0 && (
                <MergeFileOrganizer
                  entries={mergeEntries}
                  onChange={setMergeEntries}
                />
              )}

              {/* ── Compress: quality selector ───────────────────────────── */}
              {selectedTool === 'compress' && files.length > 0 && (
                <div className={styles.options}>
                  <h3 className={styles.optionsTitle}>Compression Quality</h3>
                  <div className={styles.qualityOptions}>
                    {(['screen', 'ebook', 'printer', 'prepress'] as Quality[]).map((q) => (
                      <label key={q} className={`${styles.radioLabel} ${quality === q ? styles.radioLabelActive : ''}`}>
                        <input
                          type="radio"
                          name="quality"
                          value={q}
                          checked={quality === q}
                          onChange={(e) => setQuality(e.target.value as Quality)}
                          className={styles.radio}
                        />
                        <span className={styles.radioText}>
                          {q.charAt(0).toUpperCase() + q.slice(1)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Split: mode + range inputs ───────────────────────────── */}
              {selectedTool === 'split' && files.length > 0 && (
                <div className={styles.options}>
                  <h3 className={styles.optionsTitle}>Split Mode</h3>
                  <div className={styles.splitModeOptions}>
                    <label className={`${styles.radioLabel} ${splitMode === 'all' ? styles.radioLabelActive : ''}`}>
                      <input
                        type="radio"
                        name="splitMode"
                        value="all"
                        checked={splitMode === 'all'}
                        onChange={(e) => setSplitMode(e.target.value as 'all' | 'range')}
                        className={styles.radio}
                      />
                      <span className={styles.radioText}>All Pages (Individual)</span>
                    </label>
                    <label className={`${styles.radioLabel} ${splitMode === 'range' ? styles.radioLabelActive : ''}`}>
                      <input
                        type="radio"
                        name="splitMode"
                        value="range"
                        checked={splitMode === 'range'}
                        onChange={(e) => setSplitMode(e.target.value as 'all' | 'range')}
                        className={styles.radio}
                      />
                      <span className={styles.radioText}>Custom Ranges</span>
                    </label>
                  </div>

                  {splitMode === 'range' && (
                    <div className={styles.rangeInputs}>
                      {ranges.map((range, index) => (
                        <div key={index} className={styles.rangeRow}>
                          <input
                            type="number"
                            min="1"
                            value={range.start}
                            onChange={(e) => updateRange(index, 'start', parseInt(e.target.value))}
                            className={styles.rangeInput}
                            placeholder="Start"
                          />
                          <span className={styles.rangeSeparator}>to</span>
                          <input
                            type="number"
                            min="1"
                            value={range.end}
                            onChange={(e) => updateRange(index, 'end', parseInt(e.target.value))}
                            className={styles.rangeInput}
                            placeholder="End"
                          />
                          {ranges.length > 1 && (
                            <button
                              onClick={() => removeRange(index)}
                              className={styles.removeRangeButton}
                              type="button"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={addRange} className={styles.addRangeButton} type="button">
                        + Add Range
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── PDF → Word: conversion quality result ───────────────── */}
              {selectedTool === 'pdf-to-word' && conversionScore !== null && conversionQuality && (
                <ConversionQualityCard
                  score={conversionScore}
                  quality={conversionQuality}
                  notes={conversionNotes}
                />
              )}

              {/* Alerts */}
              {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}
              {success && !conversionScore && (
                <div className={`${styles.alert} ${styles.alertSuccess}`}>{success}</div>
              )}

              {/* Action button */}
              <button
                onClick={getButtonAction()}
                disabled={isDisabled}
                className={`${styles.processButton} ${isConvertToPdf ? styles.processButtonConvert : ''} ${isExportTool ? styles.processButtonExport : ''}`}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner} />
                    Processing...
                  </>
                ) : (
                  <>
                    {selectedTool === 'modify' && (
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    )}
                    {selectedTool === 'annotate' && (
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    )}
                    {isConvertToPdf && (
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    )}
                    {isExportTool && (
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                    {selectedTool !== 'modify' && selectedTool !== 'annotate' && !isConvertToPdf && !isExportTool && (
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                    {getButtonLabel()}
                  </>
                )}
              </button>
            </div>
          )}
        </main>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <nav className={styles.footerLinks}>
          <Link href="/privacy-policy" className={styles.footerLink}>Privacy Policy</Link>
          <span className={styles.footerDivider}>·</span>
          <Link href="/terms-of-service" className={styles.footerLink}>Terms of Service</Link>
          <span className={styles.footerDivider}>·</span>
          <Link href="/contact" className={styles.footerLink}>Contact Support</Link>
        </nav>
        <p className={styles.footerCredit}>
          Made with ❤️ by{' '}
          <a href="mailto:admin@firmanasgani.id" className={styles.footerCreditLink}>admin@firmanasgani.id</a>
          {' · '}
          <a href="https://firmanasgani.id" target="_blank" rel="noopener noreferrer" className={styles.footerCreditLink}>firmanasgani.id</a>
        </p>
      </footer>

      <SupportBanner />
      <WhatsNewModal />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ConversionQualityCard — shows PDF → Word quality estimate after export
// ─────────────────────────────────────────────────────────────────────────────

function ConversionQualityCard({
  score,
  quality,
  notes,
}: {
  score: number;
  quality: ConversionQuality;
  notes: string;
}) {
  const meta = qualityMeta[quality];

  return (
    <div className={styles.qualityCard}>
      <div className={styles.qualityCardHeader}>
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span className={styles.qualityCardTitle}>Conversion Quality Estimate</span>
        <span
          className={styles.qualityBadge}
          style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}
        >
          {meta.label}
        </span>
      </div>

      {/* Score bar */}
      <div className={styles.scoreBar}>
        <div className={styles.scoreBarTrack}>
          <div
            className={styles.scoreBarFill}
            style={{
              width: `${score}%`,
              background: score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444',
            }}
          />
        </div>
        <span className={styles.scoreValue}>{score}%</span>
      </div>

      <p className={styles.qualityNotes}>{notes}</p>

      <p className={styles.qualityDisclaimer}>
        Estimate is based on image density. Text-heavy PDFs convert with high fidelity;
        scanned or image-only PDFs may require post-edit in Word.
      </p>
    </div>
  );
}
