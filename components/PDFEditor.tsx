'use client';

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import styles from './PDFEditor.module.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFPage {
  pageNumber: number;
  rotation: 0 | 90 | 180 | 270;
  deleted: boolean;
}

interface PDFEditorProps {
  file: File;
  onSave: (operations: {
    pagesToDelete: number[];
    rotations: { page: number; rotation: 90 | 180 | 270 }[];
    reorder?: number[];
  }) => void;
  onCancel: () => void;
}

export default function PDFEditor({ file, onSave, onCancel }: PDFEditorProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [draggedPage, setDraggedPage] = useState<number | null>(null);

  useEffect(() => {
    // Create object URL for the file
    const url = URL.createObjectURL(file);
    setFileUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    // Initialize pages
    const initialPages: PDFPage[] = Array.from({ length: numPages }, (_, i) => ({
      pageNumber: i + 1,
      rotation: 0,
      deleted: false,
    }));
    setPages(initialPages);
  };

  const toggleDeletePage = (pageNumber: number) => {
    setPages(
      pages.map((page) =>
        page.pageNumber === pageNumber
          ? { ...page, deleted: !page.deleted }
          : page
      )
    );
  };

  const rotatePage = (pageNumber: number) => {
    setPages(
      pages.map((page) => {
        if (page.pageNumber === pageNumber) {
          const newRotation = ((page.rotation + 90) % 360) as 0 | 90 | 180 | 270;
          return { ...page, rotation: newRotation };
        }
        return page;
      })
    );
  };

  const handleDragStart = (pageNumber: number) => {
    setDraggedPage(pageNumber);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetPageNumber: number) => {
    if (draggedPage === null || draggedPage === targetPageNumber) return;

    const newPages = [...pages];
    const draggedIndex = newPages.findIndex((p) => p.pageNumber === draggedPage);
    const targetIndex = newPages.findIndex((p) => p.pageNumber === targetPageNumber);

    // Swap pages
    const [removed] = newPages.splice(draggedIndex, 1);
    newPages.splice(targetIndex, 0, removed);

    setPages(newPages);
    setDraggedPage(null);
  };

  const handleSave = () => {
    const pagesToDelete = pages
      .filter((page) => page.deleted)
      .map((page) => page.pageNumber);

    const rotations = pages
      .filter((page) => page.rotation !== 0 && !page.deleted)
      .map((page) => ({
        page: page.pageNumber,
        rotation: page.rotation as 90 | 180 | 270,
      }));

    const reorder = pages.map((page) => page.pageNumber);
    const isReordered = reorder.some((num, idx) => num !== idx + 1);

    onSave({
      pagesToDelete,
      rotations,
      reorder: isReordered ? reorder : undefined,
    });
  };

  const activePages = pages.filter((page) => !page.deleted);
  const deletedPages = pages.filter((page) => page.deleted);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>📝 PDF Editor</h2>
        <p className={styles.subtitle}>
          {file.name} • {numPages} pages
        </p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.stats}>
          <span className={styles.statItem}>
            ✅ Active: <strong>{activePages.length}</strong>
          </span>
          <span className={styles.statItem}>
            🗑️ Deleted: <strong>{deletedPages.length}</strong>
          </span>
        </div>
        <div className={styles.actions}>
          <button onClick={onCancel} className={styles.cancelButton}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={styles.saveButton}
            disabled={activePages.length === 0}
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className={styles.instructions}>
        <p>
          <strong>💡 Instructions:</strong> Click trash icon to delete • Click rotate
          icon to rotate • Drag & drop to reorder pages
        </p>
      </div>

      <div className={styles.pagesGrid}>
        {fileUrl && (
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            className={styles.document}
          >
            {pages.map((page) => (
              <div
                key={page.pageNumber}
                className={`${styles.pageCard} ${
                  page.deleted ? styles.deleted : ''
                } ${draggedPage === page.pageNumber ? styles.dragging : ''}`}
                draggable={!page.deleted}
                onDragStart={() => handleDragStart(page.pageNumber)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(page.pageNumber)}
              >
                <div className={styles.pageNumber}>
                  Page {page.pageNumber}
                  {page.deleted && <span className={styles.deletedBadge}>DELETED</span>}
                </div>

                <div className={styles.pagePreview}>
                  <Page
                    pageNumber={page.pageNumber}
                    width={200}
                    rotate={page.rotation}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </div>

                <div className={styles.pageActions}>
                  <button
                    onClick={() => rotatePage(page.pageNumber)}
                    className={styles.actionButton}
                    title="Rotate 90°"
                    disabled={page.deleted}
                  >
                    🔄
                  </button>
                  <button
                    onClick={() => toggleDeletePage(page.pageNumber)}
                    className={`${styles.actionButton} ${
                      page.deleted ? styles.restoreButton : styles.deleteButton
                    }`}
                    title={page.deleted ? 'Restore' : 'Delete'}
                  >
                    {page.deleted ? '↩️' : '🗑️'}
                  </button>
                </div>

                {page.rotation !== 0 && !page.deleted && (
                  <div className={styles.rotationBadge}>{page.rotation}°</div>
                )}
              </div>
            ))}
          </Document>
        )}
      </div>

      {activePages.length === 0 && (
        <div className={styles.emptyState}>
          <p>⚠️ You cannot delete all pages. Please restore at least one page.</p>
        </div>
      )}
    </div>
  );
}
