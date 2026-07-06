'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { removeBackground } from '@imgly/background-removal';
import styles from './BackgroundRemover.module.css';

interface BackgroundRemoverProps {
  file: File;
  onDone: (blob: Blob, filename: string) => void;
  onCancel: () => void;
}

type Status = 'processing' | 'done' | 'error';

export default function BackgroundRemover({ file, onDone, onCancel }: BackgroundRemoverProps) {
  const [status, setStatus] = useState<Status>('processing');
  const [progressLabel, setProgressLabel] = useState('Starting…');
  const [progressPct, setProgressPct] = useState(0);
  const [resultUrl, setResultUrl] = useState('');
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const objectUrls = useRef<string[]>([]);

  const originalUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => URL.revokeObjectURL(originalUrl);
  }, [originalUrl]);

  useEffect(() => {
    let cancelled = false;

    removeBackground(file, {
      progress: (key, current, total) => {
        if (cancelled) return;
        setProgressLabel(key.startsWith('fetch') ? 'Downloading model…' : 'Processing…');
        setProgressPct(total > 0 ? Math.round((current / total) * 100) : 0);
      },
    })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        objectUrls.current.push(url);
        setResultBlob(blob);
        setResultUrl(url);
        setStatus('done');
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : 'Background removal failed');
        setStatus('error');
      });

    return () => {
      cancelled = true;
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current = [];
    };
  }, [file]);

  const handleDownload = () => {
    if (!resultBlob) return;
    const baseName = file.name.replace(/\.[^.]+$/, '');
    onDone(resultBlob, `${baseName}_no-bg.png`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>✂️ Remove Background</h2>
        <p className={styles.subtitle}>{file.name}</p>
      </div>

      <div className={styles.previewGrid}>
        <div className={styles.previewCard}>
          <span className={styles.previewLabel}>Original</span>
          <div className={styles.previewBox}>
            {originalUrl && <img src={originalUrl} alt="Original" className={styles.previewImage} />}
          </div>
        </div>

        <div className={styles.previewCard}>
          <span className={styles.previewLabel}>Background removed</span>
          <div className={`${styles.previewBox} ${styles.checkerboard}`}>
            {status === 'processing' && (
              <div className={styles.processingOverlay}>
                <span className={styles.spinner} />
                <p className={styles.progressLabel}>{progressLabel}</p>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            )}
            {status === 'error' && (
              <div className={styles.errorOverlay}>
                <p>⚠️ {errorMessage}</p>
              </div>
            )}
            {status === 'done' && resultUrl && (
              <img src={resultUrl} alt="Background removed" className={styles.previewImage} />
            )}
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button onClick={onCancel} className={styles.cancelButton}>
          Cancel
        </button>
        <button onClick={handleDownload} className={styles.saveButton} disabled={status !== 'done'}>
          Download PNG
        </button>
      </div>
    </div>
  );
}
