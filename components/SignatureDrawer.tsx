'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './SignatureDrawer.module.css';

interface Props {
  onConfirm: (imageData: string) => void;
  onClose: () => void;
}

export default function SignatureDrawer({ onConfirm, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'draw' | 'upload'>('draw');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [activeTab]);

  const getPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      e.preventDefault();
      isDrawingRef.current = true;
      lastPosRef.current = getPos(e, canvas);
    },
    []
  );

  const onDraw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      e.preventDefault();
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const pos = getPos(e, canvas);
      const last = lastPosRef.current;
      if (last) {
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
      lastPosRef.current = pos;
    },
    []
  );

  const stopDraw = useCallback(() => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleConfirm = () => {
    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      onConfirm(canvas.toDataURL('image/png'));
    } else if (uploadedImage) {
      onConfirm(uploadedImage);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>Tanda Tangan</h3>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'draw' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('draw')}
          >
            ✏️ Gambar
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'upload' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            📤 Upload Gambar
          </button>
        </div>

        {activeTab === 'draw' && (
          <div className={styles.drawArea}>
            <p className={styles.hint}>Gambar tanda tangan Anda di bawah ini:</p>
            <canvas
              ref={canvasRef}
              width={460}
              height={200}
              className={styles.sigCanvas}
              onMouseDown={startDraw}
              onMouseMove={onDraw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={onDraw}
              onTouchEnd={stopDraw}
            />
            <button onClick={clearCanvas} className={styles.clearBtn}>
              Hapus Semua
            </button>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className={styles.uploadArea}>
            <label className={styles.uploadLabel}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className={styles.fileInput}
              />
              {uploadedImage ? (
                <img src={uploadedImage} alt="Tanda tangan" className={styles.uploadPreview} />
              ) : (
                <div className={styles.uploadPlaceholder}>
                  <span className={styles.uploadIcon}>📎</span>
                  <p>Klik untuk upload gambar tanda tangan</p>
                  <small>PNG, JPG, JPEG</small>
                </div>
              )}
            </label>
          </div>
        )}

        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancelBtn}>
            Batal
          </button>
          <button
            onClick={handleConfirm}
            className={styles.confirmBtn}
            disabled={activeTab === 'upload' && !uploadedImage}
          >
            Gunakan Tanda Tangan
          </button>
        </div>
      </div>
    </div>
  );
}
