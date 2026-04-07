'use client';

import { useEffect, useState } from 'react';
import styles from './WhatsNewModal.module.css';

// Bump this key whenever you want the modal to re-appear for all users
// (e.g. on the next major feature release).
const COOKIE_KEY = 'nextpdf_whats_new_v2';
const COOKIE_TTL_DAYS = 365;

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? match.split('=')[1] : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature list
// ─────────────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    color: '#2563EB',
    bg: '#EFF6FF',
    title: 'Merge PDF — File Ordering',
    description:
      'Drag-and-drop atau gunakan tombol ↑↓ untuk mengatur urutan file sebelum digabung.',
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    color: '#0891B2',
    bg: '#ECFEFF',
    title: 'Merge PDF — Pilih Halaman per File',
    description:
      'Tentukan halaman mana yang diambil dari tiap file. Format: 1-3, 2,4,6, atau 1-3,5,7-9.',
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    color: '#6366F1',
    bg: '#EEF2FF',
    title: 'PDF → Word (Baru)',
    description:
      'Export PDF ke dokumen Word (.docx) yang bisa diedit. Tersedia di sidebar grup "Export PDF".',
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: '#059669',
    bg: '#ECFDF5',
    title: 'Estimasi Kualitas Konversi',
    description:
      'Setelah export PDF → Word, kamu akan melihat persentase estimasi keberhasilan konversi berdasarkan kepadatan gambar di PDF.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function WhatsNewModal() {
  const [visible, setVisible] = useState(false);

  // Only show if the user hasn't dismissed this version yet
  useEffect(() => {
    if (!getCookie(COOKIE_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setCookie(COOKIE_KEY, 'dismissed', COOKIE_TTL_DAYS);
    setVisible(false);
  };

  // Close on Escape key
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => e.target === e.currentTarget && dismiss()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
    >
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.newBadge}>Baru</span>
            <h2 id="whats-new-title" className={styles.title}>Yang Baru di NextPDF</h2>
          </div>
          <button
            className={styles.closeBtn}
            onClick={dismiss}
            aria-label="Tutup modal"
            type="button"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Feature list */}
        <ul className={styles.list}>
          {features.map((f, i) => (
            <li key={i} className={styles.item}>
              <span
                className={styles.iconWrap}
                style={{ color: f.color, background: f.bg }}
              >
                {f.icon}
              </span>
              <div className={styles.itemBody}>
                <p className={styles.itemTitle}>{f.title}</p>
                <p className={styles.itemDesc}>{f.description}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.dismissBtn} onClick={dismiss} type="button">
            Mengerti, jangan tampilkan lagi
          </button>
        </div>
      </div>
    </div>
  );
}
