'use client';

import { useRef } from 'react';
import styles from './MergeFileOrganizer.module.css';

export interface MergeFileEntry {
  id: string;
  file: File;
  pageRange: string;
}

interface MergeFileOrganizerProps {
  entries: MergeFileEntry[];
  onChange: (entries: MergeFileEntry[]) => void;
}

export default function MergeFileOrganizer({ entries, onChange }: MergeFileOrganizerProps) {
  const dragIndexRef = useRef<number | null>(null);

  // ── Reorder helpers ──────────────────────────────────────────────────────

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...entries];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const moveUp = (i: number) => reorder(i, i - 1);
  const moveDown = (i: number) => reorder(i, i + 1);

  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));

  const setPageRange = (i: number, value: string) =>
    onChange(entries.map((e, idx) => (idx === i ? { ...e, pageRange: value } : e)));

  // ── Drag-and-drop handlers ───────────────────────────────────────────────

  const handleDragStart = (i: number) => (e: React.DragEvent) => {
    dragIndexRef.current = i;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (i: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || from === i) return;
    reorder(from, i);
    dragIndexRef.current = i;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
  };

  if (entries.length === 0) return null;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          File Order
        </h3>
        <span className={styles.badge}>{entries.length} file{entries.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Sortable list */}
      <ul className={styles.list} role="list" aria-label="PDF files in merge order">
        {entries.map((entry, i) => (
          <li
            key={entry.id}
            className={styles.item}
            draggable
            onDragStart={handleDragStart(i)}
            onDragEnter={handleDragEnter(i)}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {/* Drag handle */}
            <span className={styles.dragHandle} aria-hidden>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <circle cx="3.5" cy="2.5" r="1.2" />
                <circle cx="3.5" cy="6" r="1.2" />
                <circle cx="3.5" cy="9.5" r="1.2" />
                <circle cx="8.5" cy="2.5" r="1.2" />
                <circle cx="8.5" cy="6" r="1.2" />
                <circle cx="8.5" cy="9.5" r="1.2" />
              </svg>
            </span>

            {/* Order badge */}
            <span className={styles.order} aria-label={`File ${i + 1}`}>{i + 1}</span>

            {/* File info */}
            <div className={styles.fileInfo}>
              <p className={styles.fileName} title={entry.file.name}>{entry.file.name}</p>
              <p className={styles.fileMeta}>{(entry.file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>

            {/* Page range input */}
            <div className={styles.pageRangeGroup}>
              <input
                type="text"
                value={entry.pageRange}
                onChange={(e) => setPageRange(i, e.target.value)}
                placeholder="All pages"
                className={styles.pageRangeInput}
                aria-label={`Page range for ${entry.file.name}`}
                title="Leave empty to include all pages. Examples: 1-3 · 1,3,5 · 1-3,5,7-9"
              />
            </div>

            {/* Controls */}
            <div className={styles.controls}>
              <button
                onClick={() => moveUp(i)}
                disabled={i === 0}
                className={styles.controlBtn}
                type="button"
                aria-label="Move up"
                title="Move up"
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => moveDown(i)}
                disabled={i === entries.length - 1}
                className={styles.controlBtn}
                type="button"
                aria-label="Move down"
                title="Move down"
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                onClick={() => remove(i)}
                className={`${styles.controlBtn} ${styles.removeBtn}`}
                type="button"
                aria-label="Remove file"
                title="Remove file"
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Page range hint */}
      <p className={styles.hint}>
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <strong>Pages</strong>: leave blank for all · format: <code>1-3</code>, <code>2,4,6</code>, or <code>1-3,5,7-9</code>
      </p>
    </div>
  );
}
