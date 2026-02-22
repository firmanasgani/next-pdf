'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import FileUpload from '@/components/FileUpload';
import styles from './page.module.css';

// Dynamically import PDFEditor to avoid SSR issues
const PDFEditor = dynamic(() => import('@/components/PDFEditor'), {
  ssr: false,
  loading: () => <div className={styles.loading}>Loading PDF Editor...</div>,
});

type Tool = 'merge' | 'compress' | 'split' | 'modify';
type Quality = 'screen' | 'ebook' | 'printer' | 'prepress';

export default function Home() {
  const [selectedTool, setSelectedTool] = useState<Tool>('merge');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  // Compress options
  const [quality, setQuality] = useState<Quality>('ebook');

  // Split options
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

  const processRequest = async (
    url: string,
    formData: FormData,
    filename: string
  ) => {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Processing failed');
    }

    // Download the file
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

  const addRange = () => {
    setRanges([...ranges, { start: 1, end: 1 }]);
  };

  const removeRange = (index: number) => {
    setRanges(ranges.filter((_, i) => i !== index));
  };

  const updateRange = (
    index: number,
    field: 'start' | 'end',
    value: number
  ) => {
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

  const handleEditorCancel = () => {
    setShowEditor(false);
  };

  const handleOpenEditor = () => {
    if (files.length === 0) {
      setError('Please select a PDF file first');
      return;
    }
    setShowEditor(true);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.titleIcon}>📄</span>
          NextPDF
        </h1>
        <p className={styles.subtitle}>
          Professional PDF Processing Tool - Merge, Compress, Split & More
        </p>
      </header>

      <main className={styles.main}>
        <div className={styles.toolSelector}>
          <button
            className={`${styles.toolButton} ${
              selectedTool === 'merge' ? styles.active : ''
            }`}
            onClick={() => setSelectedTool('merge')}
          >
            <span className={styles.toolIcon}>🔗</span>
            Merge
          </button>
          <button
            className={`${styles.toolButton} ${
              selectedTool === 'compress' ? styles.active : ''
            }`}
            onClick={() => setSelectedTool('compress')}
          >
            <span className={styles.toolIcon}>🗜️</span>
            Compress
          </button>
          <button
            className={`${styles.toolButton} ${
              selectedTool === 'split' ? styles.active : ''
            }`}
            onClick={() => setSelectedTool('split')}
          >
            <span className={styles.toolIcon}>✂️</span>
            Split
          </button>
          <button
            className={`${styles.toolButton} ${
              selectedTool === 'modify' ? styles.active : ''
            }`}
            onClick={() => setSelectedTool('modify')}
          >
            <span className={styles.toolIcon}>✏️</span>
            Edit PDF
          </button>
        </div>

        {showEditor && files.length > 0 ? (
          <PDFEditor
            file={files[0]}
            onSave={handleEditorSave}
            onCancel={handleEditorCancel}
          />
        ) : (
          <div className={styles.content}>
          <FileUpload
            multiple={selectedTool === 'merge'}
            onFilesSelected={handleFilesSelected}
            maxFiles={selectedTool === 'merge' ? 10 : 1}
          />

          {selectedTool === 'compress' && files.length > 0 && (
            <div className={styles.options}>
              <h3 className={styles.optionsTitle}>Compression Quality</h3>
              <div className={styles.qualityOptions}>
                {(['screen', 'ebook', 'printer', 'prepress'] as Quality[]).map(
                  (q) => (
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
                  )
                )}
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
                    onChange={(e) =>
                      setSplitMode(e.target.value as 'all' | 'range')
                    }
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
                    onChange={(e) =>
                      setSplitMode(e.target.value as 'all' | 'range')
                    }
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
                        onChange={(e) =>
                          updateRange(index, 'start', parseInt(e.target.value))
                        }
                        className={styles.rangeInput}
                        placeholder="Start"
                      />
                      <span className={styles.rangeSeparator}>to</span>
                      <input
                        type="number"
                        min="1"
                        value={range.end}
                        onChange={(e) =>
                          updateRange(index, 'end', parseInt(e.target.value))
                        }
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
                  <button
                    onClick={addRange}
                    className={styles.addRangeButton}
                    type="button"
                  >
                    + Add Range
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className={styles.alert + ' ' + styles.error}>{error}</div>
          )}

          {success && (
            <div className={styles.alert + ' ' + styles.success}>{success}</div>
          )}

          <button
            onClick={selectedTool === 'modify' ? handleOpenEditor : handleProcess}
            disabled={loading || files.length === 0}
            className={styles.processButton}
          >
            {loading ? (
              <>
                <span className={styles.spinner}></span>
                Processing...
              </>
            ) : selectedTool === 'modify' ? (
              <>✏️ Open Editor</>
            ) : (
              <>Process PDF</>
            )}
          </button>
        </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>
          Built with Next.js, pdf-lib & Ghostscript | No data stored permanently
        </p>
      </footer>
    </div>
  );
}
