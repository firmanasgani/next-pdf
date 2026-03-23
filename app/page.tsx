'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import FileUpload from '@/components/FileUpload';
import SupportBanner from '@/components/SupportBanner';
import styles from './page.module.css';

const PDFEditor = dynamic(() => import('@/components/PDFEditor'), {
  ssr: false,
  loading: () => <div className={styles.loading}>Loading PDF Editor...</div>,
});

const PDFAnnotator = dynamic(() => import('@/components/PDFAnnotator'), {
  ssr: false,
  loading: () => <div className={styles.loading}>Loading PDF Annotator...</div>,
});

type Tool = 'merge' | 'compress' | 'split' | 'modify' | 'annotate';
type Quality = 'screen' | 'ebook' | 'printer' | 'prepress';

const toolConfig: Record<Tool, { label: string; title: string; icon: React.ReactNode }> = {
  merge: {
    label: 'Merge',
    title: 'Merge PDF',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
      </svg>
    ),
  },
  compress: {
    label: 'Compress',
    title: 'Compress PDF',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    ),
  },
  split: {
    label: 'Split',
    title: 'Split PDF',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
      </svg>
    ),
  },
  modify: {
    label: 'Edit PDF',
    title: 'Edit PDF',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  annotate: {
    label: 'Annotate',
    title: 'Annotate PDF',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
  },
};

export default function Home() {
  const [selectedTool, setSelectedTool] = useState<Tool>('merge');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showAnnotator, setShowAnnotator] = useState(false);

  const [quality, setQuality] = useState<Quality>('ebook');
  const [splitMode, setSplitMode] = useState<'all' | 'range'>('all');
  const [ranges, setRanges] = useState<{ start: number; end: number }[]>([
    { start: 1, end: 1 },
  ]);

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setError(null);
    setSuccess(null);
  };

  const handleProcess = async () => {
    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();

      if (selectedTool === 'merge') {
        files.forEach((file) => formData.append('files', file));
        await processRequest('/api/merge', formData, 'merged.pdf');
      } else if (selectedTool === 'compress') {
        formData.append('file', files[0]);
        formData.append('quality', quality);
        await processRequest('/api/compress', formData, 'compressed.pdf');
      } else if (selectedTool === 'split') {
        formData.append('file', files[0]);
        formData.append('mode', splitMode);
        if (splitMode === 'range') {
          formData.append('ranges', JSON.stringify(ranges));
        }
        const filename = splitMode === 'all' ? 'split_pdfs.zip' : 'split.pdf';
        await processRequest('/api/split', formData, filename);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const processRequest = async (url: string, formData: FormData, filename: string) => {
    const response = await fetch(url, { method: 'POST', body: formData });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Processing failed');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);

    setSuccess('File processed successfully!');
    setFiles([]);
  };

  const addRange = () => setRanges([...ranges, { start: 1, end: 1 }]);
  const removeRange = (index: number) => setRanges(ranges.filter((_, i) => i !== index));
  const updateRange = (index: number, field: 'start' | 'end', value: number) => {
    const newRanges = [...ranges];
    newRanges[index][field] = value;
    setRanges(newRanges);
  };

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
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `annotated_${files[0]?.name ?? 'document.pdf'}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
    setSuccess('PDF berhasil disimpan dengan anotasi!');
    setFiles([]);
  };

  const handleToolChange = (tool: Tool) => {
    setSelectedTool(tool);
    setFiles([]);
    setError(null);
    setSuccess(null);
    setShowEditor(false);
    setShowAnnotator(false);
  };

  return (
    <div className={styles.container}>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.logo}>
          <svg width="28" height="28" fill="none" stroke="#2563EB" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className={styles.logoText}>NextPDF</span>
        </div>

        <div className={styles.toolSelector}>
          {(Object.keys(toolConfig) as Tool[]).map((tool) => (
            <button
              key={tool}
              className={`${styles.toolButton} ${selectedTool === tool ? styles.active : ''}`}
              onClick={() => handleToolChange(tool)}
            >
              <span className={styles.toolIcon}>{toolConfig[tool].icon}</span>
              {toolConfig[tool].label}
            </button>
          ))}
        </div>

        <div className={styles.navSpacer} />
      </nav>

      {/* Main Content */}
      <main className={styles.main}>
        {showAnnotator && files.length > 0 ? (
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
            <h2 className={styles.toolTitle}>{toolConfig[selectedTool].title}</h2>

            <FileUpload
              multiple={selectedTool === 'merge'}
              onFilesSelected={handleFilesSelected}
              maxFiles={selectedTool === 'merge' ? 10 : 1}
            />

            {selectedTool === 'compress' && files.length > 0 && (
              <div className={styles.options}>
                <h3 className={styles.optionsTitle}>Compression Quality</h3>
                <div className={styles.qualityOptions}>
                  {(['screen', 'ebook', 'printer', 'prepress'] as Quality[]).map((q) => (
                    <label key={q} className={styles.radioLabel}>
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

            {selectedTool === 'split' && files.length > 0 && (
              <div className={styles.options}>
                <h3 className={styles.optionsTitle}>Split Mode</h3>
                <div className={styles.splitModeOptions}>
                  <label className={styles.radioLabel}>
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
                  <label className={styles.radioLabel}>
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

            {error && <div className={`${styles.alert} ${styles.error}`}>{error}</div>}
            {success && <div className={`${styles.alert} ${styles.success}`}>{success}</div>}

            <button
              onClick={
                selectedTool === 'modify'
                  ? handleOpenEditor
                  : selectedTool === 'annotate'
                  ? handleOpenAnnotator
                  : handleProcess
              }
              disabled={loading || files.length === 0}
              className={styles.processButton}
            >
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Processing...
                </>
              ) : selectedTool === 'modify' ? (
                <>
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Open Editor
                </>
              ) : selectedTool === 'annotate' ? (
                <>
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Open Annotator
                </>
              ) : (
                <>
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Process PDF
                </>
              )}
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
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
    </div>
  );
}
