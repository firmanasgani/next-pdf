'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styles from './ImageEditor.module.css';

type Rotation = 0 | 90 | 180 | 270;
type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | null;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ImageEditorProps {
  file: File;
  onSave: (blob: Blob, filename: string) => void;
  onCancel: () => void;
}

const MAX_PREVIEW_SIZE = 640;
const MIN_CROP_SIZE = 20;

export default function ImageEditor({ file, onSave, onCancel }: ImageEditorProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [outputWidth, setOutputWidth] = useState(0);
  const [outputHeight, setOutputHeight] = useState(0);
  const [lockAspect, setLockAspect] = useState(true);
  const [resetKey, setResetKey] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragMode = useRef<DragMode>(null);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, rect: { x: 0, y: 0, w: 0, h: 0 } });

  // ── Load the source image ──────────────────────────────────────────────────

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ── Preview size is purely derived from the loaded image + rotation ────────

  const preview = useMemo(() => {
    if (!image) return { width: 0, height: 0 };

    const rotW = rotation % 180 === 0 ? image.naturalWidth : image.naturalHeight;
    const rotH = rotation % 180 === 0 ? image.naturalHeight : image.naturalWidth;
    const scale = Math.min(1, MAX_PREVIEW_SIZE / rotW, MAX_PREVIEW_SIZE / rotH);

    return { width: Math.round(rotW * scale), height: Math.round(rotH * scale) };
  }, [image, rotation]);

  // ── Reset the crop selection + output size whenever rotation changes ───────
  // (Adjusting state during render, per React's guidance, instead of an effect.)

  const currentKey = image ? `${rotation}` : null;
  if (image && resetKey !== currentKey) {
    setResetKey(currentKey);
    setCrop({ x: 0, y: 0, w: preview.width, h: preview.height });
    setOutputWidth(preview.width);
    setOutputHeight(preview.height);
  }

  // ── Draw the rotated image into the preview canvas ─────────────────────────

  const drawRotated = useCallback(
    (ctx: CanvasRenderingContext2D, img: CanvasImageSource, baseW: number, baseH: number, rot: Rotation, canvasW: number, canvasH: number) => {
      ctx.clearRect(0, 0, canvasW, canvasH);
      ctx.save();
      ctx.translate(canvasW / 2, canvasH / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);
      ctx.restore();
    },
    [],
  );

  useEffect(() => {
    if (!image || !canvasRef.current || preview.width === 0) return;
    const canvas = canvasRef.current;
    canvas.width = preview.width;
    canvas.height = preview.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseW = rotation % 180 === 0 ? preview.width : preview.height;
    const baseH = rotation % 180 === 0 ? preview.height : preview.width;
    drawRotated(ctx, image, baseW, baseH, rotation, preview.width, preview.height);
  }, [image, preview, rotation, drawRotated]);

  // ── Rotation controls ───────────────────────────────────────────────────────

  const rotateLeft = () => setRotation((r) => ((r + 270) % 360) as Rotation);
  const rotateRight = () => setRotation((r) => ((r + 90) % 360) as Rotation);

  // ── Crop drag handling ──────────────────────────────────────────────────────

  const clampRect = useCallback(
    (r: Rect): Rect => {
      let { x, y, w, h } = r;
      w = Math.max(MIN_CROP_SIZE, Math.min(w, preview.width));
      h = Math.max(MIN_CROP_SIZE, Math.min(h, preview.height));
      x = Math.max(0, Math.min(x, preview.width - w));
      y = Math.max(0, Math.min(y, preview.height - h));
      return { x, y, w, h };
    },
    [preview],
  );

  const startDrag = (mode: DragMode) => (e: React.MouseEvent) => {
    e.preventDefault();
    dragMode.current = mode;
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, rect: crop };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - dragStart.current.mouseX;
      const dy = moveEvent.clientY - dragStart.current.mouseY;
      const start = dragStart.current.rect;

      setCrop((prev) => {
        if (dragMode.current === 'move') {
          return clampRect({ ...prev, x: start.x + dx, y: start.y + dy });
        }
        if (dragMode.current === 'se') {
          return clampRect({ ...start, w: start.w + dx, h: start.h + dy });
        }
        if (dragMode.current === 'sw') {
          return clampRect({ ...start, x: start.x + dx, w: start.w - dx, h: start.h + dy });
        }
        if (dragMode.current === 'ne') {
          return clampRect({ ...start, y: start.y + dy, w: start.w + dx, h: start.h - dy });
        }
        if (dragMode.current === 'nw') {
          return clampRect({ x: start.x + dx, y: start.y + dy, w: start.w - dx, h: start.h - dy });
        }
        return prev;
      });
    };

    const onMouseUp = () => {
      dragMode.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const resetCrop = () => setCrop({ x: 0, y: 0, w: preview.width, h: preview.height });

  // ── Resize (output dimension) controls ──────────────────────────────────────

  const cropAspect = crop.h === 0 ? 1 : crop.w / crop.h;

  const handleWidthChange = (value: number) => {
    setOutputWidth(value);
    if (lockAspect) setOutputHeight(Math.round(value / cropAspect));
  };

  const handleHeightChange = (value: number) => {
    setOutputHeight(value);
    if (lockAspect) setOutputWidth(Math.round(value * cropAspect));
  };

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!image) return;

    const rotFullW = rotation % 180 === 0 ? image.naturalWidth : image.naturalHeight;
    const rotFullH = rotation % 180 === 0 ? image.naturalHeight : image.naturalWidth;

    // Render the full-resolution rotated image off-screen.
    const rotatedCanvas = document.createElement('canvas');
    rotatedCanvas.width = rotFullW;
    rotatedCanvas.height = rotFullH;
    const rotatedCtx = rotatedCanvas.getContext('2d');
    if (!rotatedCtx) return;
    const baseW = rotation % 180 === 0 ? rotFullW : rotFullH;
    const baseH = rotation % 180 === 0 ? rotFullH : rotFullW;
    drawRotated(rotatedCtx, image, baseW, baseH, rotation, rotFullW, rotFullH);

    // Map the on-screen crop rectangle to full-resolution coordinates.
    const scale = rotFullW / preview.width;
    const cropFull = {
      x: crop.x * scale,
      y: crop.y * scale,
      w: crop.w * scale,
      h: crop.h * scale,
    };

    const targetW = Math.max(1, Math.round(outputWidth) || Math.round(cropFull.w));
    const targetH = Math.max(1, Math.round(outputHeight) || Math.round(cropFull.h));

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = targetW;
    outputCanvas.height = targetH;
    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) return;
    outputCtx.drawImage(
      rotatedCanvas,
      cropFull.x,
      cropFull.y,
      cropFull.w,
      cropFull.h,
      0,
      0,
      targetW,
      targetH,
    );

    const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const extension = mimeType === 'image/png' ? 'png' : 'jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '');

    outputCanvas.toBlob(
      (blob) => {
        if (blob) onSave(blob, `${baseName}_edited.${extension}`);
      },
      mimeType,
      0.92,
    );
  };

  if (!image) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading image…</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>🖼️ Image Editor</h2>
        <p className={styles.subtitle}>
          {file.name} • {image.naturalWidth}×{image.naturalHeight}
        </p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolGroup}>
          <span className={styles.toolGroupLabel}>Rotate</span>
          <button onClick={rotateLeft} className={styles.iconButton} title="Rotate left 90°">
            ↺
          </button>
          <button onClick={rotateRight} className={styles.iconButton} title="Rotate right 90°">
            ↻
          </button>
        </div>

        <div className={styles.toolGroup}>
          <span className={styles.toolGroupLabel}>Crop</span>
          <button onClick={resetCrop} className={styles.textButton}>
            Reset selection
          </button>
        </div>

        <div className={styles.toolGroup}>
          <span className={styles.toolGroupLabel}>Resize (output)</span>
          <input
            type="number"
            min={1}
            value={outputWidth}
            onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
            className={styles.dimensionInput}
          />
          <span className={styles.dimensionX}>×</span>
          <input
            type="number"
            min={1}
            value={outputHeight}
            onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
            className={styles.dimensionInput}
          />
          <label className={styles.lockLabel}>
            <input
              type="checkbox"
              checked={lockAspect}
              onChange={(e) => setLockAspect(e.target.checked)}
            />
            Lock aspect ratio
          </label>
        </div>
      </div>

      <div className={styles.instructions}>
        <p>
          <strong>💡 Instructions:</strong> Drag the selection box to move it, drag a corner to
          resize it • Rotate with the buttons above • Set the final output size on the right
        </p>
      </div>

      <div className={styles.canvasWrapper}>
        <div
          className={styles.canvasStage}
          style={{ width: preview.width, height: preview.height }}
        >
          <canvas ref={canvasRef} className={styles.canvas} />

          {/* Dimming panels around the crop selection */}
          <div className={styles.dim} style={{ left: 0, top: 0, width: preview.width, height: crop.y }} />
          <div className={styles.dim} style={{ left: 0, top: crop.y + crop.h, width: preview.width, height: preview.height - crop.y - crop.h }} />
          <div className={styles.dim} style={{ left: 0, top: crop.y, width: crop.x, height: crop.h }} />
          <div className={styles.dim} style={{ left: crop.x + crop.w, top: crop.y, width: preview.width - crop.x - crop.w, height: crop.h }} />

          <div
            className={styles.cropBox}
            style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h }}
            onMouseDown={startDrag('move')}
          >
            <div
              className={`${styles.handle} ${styles.handleNw}`}
              onMouseDown={(e) => {
                e.stopPropagation();
                startDrag('nw')(e);
              }}
            />
            <div
              className={`${styles.handle} ${styles.handleNe}`}
              onMouseDown={(e) => {
                e.stopPropagation();
                startDrag('ne')(e);
              }}
            />
            <div
              className={`${styles.handle} ${styles.handleSw}`}
              onMouseDown={(e) => {
                e.stopPropagation();
                startDrag('sw')(e);
              }}
            />
            <div
              className={`${styles.handle} ${styles.handleSe}`}
              onMouseDown={(e) => {
                e.stopPropagation();
                startDrag('se')(e);
              }}
            />
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button onClick={onCancel} className={styles.cancelButton}>
          Cancel
        </button>
        <button onClick={handleSave} className={styles.saveButton}>
          Save Image
        </button>
      </div>
    </div>
  );
}
