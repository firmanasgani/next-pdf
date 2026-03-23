'use client';

import { useState, useEffect } from 'react';
import styles from './SupportBanner.module.css';

const STORAGE_KEY = 'nextpdf_support_minimized';

export default function SupportBanner() {
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    const wasMinimized = localStorage.getItem(STORAGE_KEY) === '1';
    setMinimized(wasMinimized);
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const toggleMinimize = () => {
    const next = !minimized;
    setMinimized(next);
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
  };

  if (!visible) return null;

  return (
    <div className={`${styles.banner} ${minimized ? styles.minimized : ''}`}>
      <button
        className={styles.topBar}
        onClick={toggleMinimize}
        type="button"
        aria-label={minimized ? 'Perluas' : 'Perkecil'}
      >
        <span className={styles.coffeeIcon}>☕</span>
        <div className={styles.topBarText}>
          <p className={styles.topBarTitle}>Dukung NextPDF</p>
          {!minimized && <p className={styles.topBarSub}>Beli kopi untuk developernya</p>}
        </div>
        <span className={styles.chevron}>
          <svg
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            className={minimized ? styles.chevronUp : styles.chevronDown}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {!minimized && (
        <div className={styles.body}>
          <p className={styles.description}>
            NextPDF gratis selamanya. Jika alat ini membantumu, dukung pengembangannya lewat Saweria!
          </p>
          <a
            href="https://saweria.co/firmanasgani"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ctaButton}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Dukung di Saweria
          </a>
        </div>
      )}
    </div>
  );
}
