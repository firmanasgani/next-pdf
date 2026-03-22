'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import SignatureDrawer from './SignatureDrawer';
import styles from './PDFAnnotator.module.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PAGE_WIDTH = 650;
// Approximate rendered page height for ratio estimations (A4/Letter average)
const EST_PAGE_HEIGHT = 842;

type Tool = 'select' | 'pen' | 'eraser' | 'text' | 'rect' | 'signature';

interface DrawPoint {
  xRatio: number;
  yRatio: number;
}

export interface Annotation {
  id: string;
  type: Tool;
  page: number;
  xRatio: number;
  yRatio: number;
  wRatio?: number;
  hRatio?: number;
  points?: DrawPoint[];
  strokeColor?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  color?: string;
  imageData?: string;
}

interface PDFAnnotatorProps {
  file: File;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getAnnotationBounds(ann: Annotation): { x: number; y: number; w: number; h: number } | null {
  switch (ann.type) {
    case 'rect':
    case 'signature':
      return { x: ann.xRatio, y: ann.yRatio, w: ann.wRatio ?? 0, h: ann.hRatio ?? 0 };
    case 'text': {
      const fs = ann.fontSize ?? 16;
      const charW = fs * 0.6 / PAGE_WIDTH;
      const charH = fs * 1.4 / EST_PAGE_HEIGHT;
      const textLen = Math.max(ann.text?.length ?? 1, 1);
      return { x: ann.xRatio, y: ann.yRatio, w: charW * textLen, h: charH };
    }
    case 'pen':
    case 'eraser': {
      const pts = ann.points;
      if (!pts || pts.length === 0) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const pt of pts) {
        minX = Math.min(minX, pt.xRatio);
        minY = Math.min(minY, pt.yRatio);
        maxX = Math.max(maxX, pt.xRatio);
        maxY = Math.max(maxY, pt.yRatio);
      }
      const pad = (ann.strokeWidth ?? 2) / PAGE_WIDTH;
      return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
    }
    default:
      return null;
  }
}

function hitTest(ann: Annotation, xRatio: number, yRatio: number): boolean {
  const b = getAnnotationBounds(ann);
  if (!b) return false;
  const pad = 0.012;
  return (
    xRatio >= b.x - pad &&
    xRatio <= b.x + b.w + pad &&
    yRatio >= b.y - pad &&
    yRatio <= b.y + b.h + pad
  );
}

function moveAnnotation(ann: Annotation, dx: number, dy: number): Annotation {
  switch (ann.type) {
    case 'text':
    case 'rect':
    case 'signature':
      return { ...ann, xRatio: ann.xRatio + dx, yRatio: ann.yRatio + dy };
    case 'pen':
    case 'eraser':
      return {
        ...ann,
        xRatio: ann.xRatio + dx,
        yRatio: ann.yRatio + dy,
        points: ann.points?.map((pt) => ({ xRatio: pt.xRatio + dx, yRatio: pt.yRatio + dy })),
      };
    default:
      return ann;
  }
}

// ── Canvas rendering ──────────────────────────────────────────────────────────

function renderAnnotation(
  ctx: CanvasRenderingContext2D,
  ann: Annotation,
  W: number,
  H: number,
  imgCache: { [id: string]: HTMLImageElement }
) {
  const x = ann.xRatio * W;
  const y = ann.yRatio * H;
  const w = (ann.wRatio ?? 0) * W;
  const h = (ann.hRatio ?? 0) * H;

  ctx.save();
  switch (ann.type) {
    case 'pen':
    case 'eraser': {
      const pts = ann.points;
      if (!pts || pts.length < 2) break;
      ctx.beginPath();
      ctx.strokeStyle = ann.strokeColor ?? '#000000';
      ctx.lineWidth = ann.strokeWidth ?? 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(pts[0].xRatio * W, pts[0].yRatio * H);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].xRatio * W, pts[i].yRatio * H);
      }
      ctx.stroke();
      break;
    }
    case 'rect': {
      ctx.fillStyle = ann.color ?? '#ffffff';
      ctx.fillRect(x, y, w, h);
      if (ann.color && ann.color !== '#ffffff' && ann.color !== '#fff') {
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);
      }
      break;
    }
    case 'text': {
      if (!ann.text) break;
      ctx.fillStyle = ann.color ?? '#000000';
      ctx.font = `${ann.fontSize ?? 16}px Arial, sans-serif`;
      // yRatio = top of text area; draw baseline at yRatio*H + fontSize
      ctx.fillText(ann.text, x, y + (ann.fontSize ?? 16));
      break;
    }
    case 'signature': {
      const img = imgCache[ann.id];
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x, y, w || 200, h || 80);
      }
      break;
    }
  }
  ctx.restore();
}

function drawSelectionBox(
  ctx: CanvasRenderingContext2D,
  ann: Annotation,
  W: number,
  H: number
) {
  const b = getAnnotationBounds(ann);
  if (!b) return;
  const pad = 6;
  ctx.save();
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(b.x * W - pad, b.y * H - pad, b.w * W + pad * 2, b.h * H + pad * 2);
  // Corner handles
  ctx.setLineDash([]);
  ctx.fillStyle = '#6366f1';
  const corners = [
    [b.x * W - pad, b.y * H - pad],
    [b.x * W + b.w * W + pad, b.y * H - pad],
    [b.x * W - pad, b.y * H + b.h * H + pad],
    [b.x * W + b.w * W + pad, b.y * H + b.h * H + pad],
  ];
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PDFAnnotator({ file, onSave, onCancel }: PDFAnnotatorProps) {
  const [numPages, setNumPages] = useState(0);
  const [fileUrl, setFileUrl] = useState('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [liveAnnotation, setLiveAnnotation] = useState<Annotation | null>(null);
  const [currentTool, setCurrentTool] = useState<Tool>('pen');
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);
  const [penColor, setPenColor] = useState('#e74c3c');
  const [penWidth, setPenWidth] = useState(3);
  const [eraserWidth, setEraserWidth] = useState(20);
  const [rectColor, setRectColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(16);
  const [textColor, setTextColor] = useState('#000000');
  const [showSigDrawer, setShowSigDrawer] = useState(false);
  const [pendingPos, setPendingPos] = useState<{ page: number; xRatio: number; yRatio: number } | null>(null);
  const [textInput, setTextInput] = useState<{
    page: number;
    xRatio: number;
    yRatio: number;
    value: string;
  } | null>(null);
  const [pageRenderSizes, setPageRenderSizes] = useState<{
    [page: number]: { width: number; height: number };
  }>({});
  const [saving, setSaving] = useState(false);
  const [hoveredAnnId, setHoveredAnnId] = useState<string | null>(null);

  // Refs
  const canvasRefs = useRef<{ [page: number]: HTMLCanvasElement | null }>({});
  const imgCache = useRef<{ [id: string]: HTMLImageElement }>({});
  const annotationsRef = useRef<Annotation[]>([]);
  const liveRef = useRef<Annotation | null>(null);
  const selectedAnnIdRef = useRef<string | null>(null);
  const isDrawingRef = useRef(false);
  const drawStartRef = useRef<{ xRatio: number; yRatio: number; page: number } | null>(null);
  const currentPathRef = useRef<DrawPoint[]>([]);
  const draggingAnnIdRef = useRef<string | null>(null);
  const dragOrigAnnRef = useRef<Annotation | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Sync refs
  useEffect(() => { annotationsRef.current = annotations; }, [annotations]);
  useEffect(() => { liveRef.current = liveAnnotation; }, [liveAnnotation]);
  useEffect(() => { selectedAnnIdRef.current = selectedAnnId; }, [selectedAnnId]);

  // Reliable focus for text input
  useEffect(() => {
    if (textInput !== null) {
      // Delay ensures the DOM element is mounted before we focus
      const raf = requestAnimationFrame(() => {
        textInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [textInput]);

  // Cancel drag/draw when switching tools
  useEffect(() => {
    isDrawingRef.current = false;
    draggingAnnIdRef.current = null;
    dragOrigAnnRef.current = null;
    drawStartRef.current = null;
    liveRef.current = null;
    setLiveAnnotation(null);
    setSelectedAnnId(null);
    setTextInput(null);
  }, [currentTool]);

  // Delete selected annotation with keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnId) {
        setAnnotations((prev) => prev.filter((a) => a.id !== selectedAnnId));
        setSelectedAnnId(null);
      }
      if (e.key === 'Escape') setSelectedAnnId(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedAnnId]);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ── Canvas redraw ────────────────────────────────────────────────────────────

  const redrawCanvas = useCallback(
    (pageNum: number, anns: Annotation[], live: Annotation | null, selId: string | null) => {
      const canvas = canvasRefs.current[pageNum];
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      for (const ann of anns) {
        if (ann.page !== pageNum) continue;
        // Skip the annotation currently being dragged (shown as liveAnnotation instead)
        if (ann.id === draggingAnnIdRef.current) continue;
        renderAnnotation(ctx, ann, W, H, imgCache.current);
      }

      if (live && live.page === pageNum) {
        renderAnnotation(ctx, live, W, H, imgCache.current);
      }

      // Selection indicator
      const selAnn = live?.id === selId ? live : anns.find((a) => a.id === selId);
      if (selAnn && selAnn.page === pageNum) {
        drawSelectionBox(ctx, selAnn, W, H);
      }
    },
    []
  );

  useEffect(() => {
    for (const page of Object.keys(pageRenderSizes)) {
      redrawCanvas(Number(page), annotations, liveAnnotation, selectedAnnId);
    }
  }, [annotations, liveAnnotation, pageRenderSizes, selectedAnnId, redrawCanvas]);

  // ── Event helpers ────────────────────────────────────────────────────────────

  const getEventPos = (e: React.MouseEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement): DrawPoint => {
    const rect = canvas.getBoundingClientRect();
    return {
      xRatio: (e.clientX - rect.left) / rect.width,
      yRatio: (e.clientY - rect.top) / rect.height,
    };
  };

  // ── Mouse handlers ───────────────────────────────────────────────────────────

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>, pageNum: number) => {
    const canvas = canvasRefs.current[pageNum];
    if (!canvas) return;
    const pos = getEventPos(e, canvas);

    // ── Select / Hand tool ──
    if (currentTool === 'select') {
      const hit = [...annotationsRef.current]
        .reverse()
        .find((a) => a.page === pageNum && hitTest(a, pos.xRatio, pos.yRatio));

      if (hit) {
        setSelectedAnnId(hit.id);
        selectedAnnIdRef.current = hit.id;
        draggingAnnIdRef.current = hit.id;
        dragOrigAnnRef.current = hit;
        drawStartRef.current = { ...pos, page: pageNum };
        isDrawingRef.current = true;
        // Show dragged annotation as liveAnnotation
        liveRef.current = { ...hit };
        setLiveAnnotation({ ...hit });
      } else {
        setSelectedAnnId(null);
        selectedAnnIdRef.current = null;
      }
      return;
    }

    // ── Text tool ──
    if (currentTool === 'text') {
      e.preventDefault();
      setTextInput({ page: pageNum, xRatio: pos.xRatio, yRatio: pos.yRatio, value: '' });
      return;
    }

    // ── Signature tool ──
    if (currentTool === 'signature') {
      setPendingPos({ page: pageNum, xRatio: pos.xRatio, yRatio: pos.yRatio });
      setShowSigDrawer(true);
      return;
    }

    // ── Pen / Eraser / Rect ──
    isDrawingRef.current = true;
    drawStartRef.current = { ...pos, page: pageNum };

    if (currentTool === 'pen' || currentTool === 'eraser') {
      currentPathRef.current = [pos];
      const live: Annotation = {
        id: `live_${Date.now()}`,
        type: currentTool,
        page: pageNum,
        xRatio: pos.xRatio,
        yRatio: pos.yRatio,
        points: [pos],
        strokeColor: currentTool === 'eraser' ? '#ffffff' : penColor,
        strokeWidth: currentTool === 'eraser' ? eraserWidth : penWidth,
      };
      liveRef.current = live;
      setLiveAnnotation(live);
    } else if (currentTool === 'rect') {
      const live: Annotation = {
        id: `live_${Date.now()}`,
        type: 'rect',
        page: pageNum,
        xRatio: pos.xRatio,
        yRatio: pos.yRatio,
        wRatio: 0,
        hRatio: 0,
        color: rectColor,
      };
      liveRef.current = live;
      setLiveAnnotation(live);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>, pageNum: number) => {
    const canvas = canvasRefs.current[pageNum];
    if (!canvas) return;
    const pos = getEventPos(e, canvas);

    // Hover detection for select tool cursor
    if (currentTool === 'select' && !isDrawingRef.current) {
      const hit = [...annotationsRef.current]
        .reverse()
        .find((a) => a.page === pageNum && hitTest(a, pos.xRatio, pos.yRatio));
      setHoveredAnnId(hit ? hit.id : null);
    }

    if (!isDrawingRef.current) return;
    const start = drawStartRef.current;
    if (!start || start.page !== pageNum) return;

    // ── Select drag ──
    if (currentTool === 'select' && draggingAnnIdRef.current && dragOrigAnnRef.current) {
      const dx = pos.xRatio - start.xRatio;
      const dy = pos.yRatio - start.yRatio;
      const moved = moveAnnotation(dragOrigAnnRef.current, dx, dy);
      liveRef.current = moved;
      setLiveAnnotation(moved);
      redrawCanvas(pageNum, annotationsRef.current, moved, selectedAnnIdRef.current);
      return;
    }

    // ── Pen / Eraser ──
    if (currentTool === 'pen' || currentTool === 'eraser') {
      currentPathRef.current.push(pos);
      const updated: Annotation = { ...liveRef.current!, points: [...currentPathRef.current] };
      liveRef.current = updated;
      setLiveAnnotation(updated);
      redrawCanvas(pageNum, annotationsRef.current, updated, selectedAnnIdRef.current);
      return;
    }

    // ── Rect ──
    if (currentTool === 'rect') {
      const x = Math.min(start.xRatio, pos.xRatio);
      const y = Math.min(start.yRatio, pos.yRatio);
      const w = Math.abs(pos.xRatio - start.xRatio);
      const h = Math.abs(pos.yRatio - start.yRatio);
      const updated: Annotation = { ...liveRef.current!, xRatio: x, yRatio: y, wRatio: w, hRatio: h };
      liveRef.current = updated;
      setLiveAnnotation(updated);
      redrawCanvas(pageNum, annotationsRef.current, updated, selectedAnnIdRef.current);
    }
  };

  const handleMouseUp = (_e: React.MouseEvent<HTMLCanvasElement>, _pageNum: number) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const live = liveRef.current;

    // ── Finalize drag ──
    if (currentTool === 'select' && draggingAnnIdRef.current && live) {
      const movedId = draggingAnnIdRef.current;
      setAnnotations((prev) => prev.map((a) => (a.id === movedId ? live : a)));
      setSelectedAnnId(live.id);
      draggingAnnIdRef.current = null;
      dragOrigAnnRef.current = null;
      liveRef.current = null;
      setLiveAnnotation(null);
      drawStartRef.current = null;
      return;
    }

    if (!live) return;

    // ── Finalize pen/eraser ──
    const isValidStroke =
      (live.type === 'pen' || live.type === 'eraser') && live.points && live.points.length >= 2;
    const isValidRect =
      live.type === 'rect' && (live.wRatio ?? 0) > 0.005 && (live.hRatio ?? 0) > 0.005;

    if (isValidStroke || isValidRect) {
      const final: Annotation = {
        ...live,
        id: `ann_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      };
      setAnnotations((prev) => [...prev, final]);
    }

    liveRef.current = null;
    setLiveAnnotation(null);
    currentPathRef.current = [];
    drawStartRef.current = null;
  };

  // ── Text confirm ─────────────────────────────────────────────────────────────

  const confirmText = () => {
    if (!textInput || !textInput.value.trim()) {
      setTextInput(null);
      return;
    }
    const ann: Annotation = {
      id: `ann_${Date.now()}`,
      type: 'text',
      page: textInput.page,
      xRatio: textInput.xRatio,
      yRatio: textInput.yRatio,
      text: textInput.value,
      fontSize,
      color: textColor,
    };
    setAnnotations((prev) => [...prev, ann]);
    setTextInput(null);
  };

  // ── Signature ────────────────────────────────────────────────────────────────

  const handleSignatureConfirm = (imageData: string) => {
    if (!pendingPos) return;
    const ann: Annotation = {
      id: `ann_sig_${Date.now()}`,
      type: 'signature',
      page: pendingPos.page,
      xRatio: pendingPos.xRatio,
      yRatio: pendingPos.yRatio,
      wRatio: 0.28,
      hRatio: 0.1,
      imageData,
    };
    const img = new Image();
    img.onload = () => {
      imgCache.current[ann.id] = img;
      setAnnotations((prev) => [...prev, ann]);
    };
    img.src = imageData;
    setShowSigDrawer(false);
    setPendingPos(null);
  };

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleUndo = () => setAnnotations((prev) => prev.slice(0, -1));

  const handleDeleteSelected = () => {
    if (!selectedAnnId) return;
    setAnnotations((prev) => prev.filter((a) => a.id !== selectedAnnId));
    setSelectedAnnId(null);
  };

  const handleClearAll = () => {
    if (!window.confirm('Hapus semua anotasi?')) return;
    setAnnotations([]);
    setSelectedAnnId(null);
  };

  const handleApply = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('annotations', JSON.stringify(annotations));
      const response = await fetch('/api/annotate', { method: 'POST', body: formData });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Gagal menyimpan anotasi');
      }
      onSave(await response.blob());
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  // ── Cursor ───────────────────────────────────────────────────────────────────

  const getCursor = (): string => {
    if (currentTool === 'select') {
      if (isDrawingRef.current) return 'grabbing';
      return hoveredAnnId ? 'grab' : 'default';
    }
    const map: Record<Tool, string> = {
      select: 'default',
      pen: 'crosshair',
      eraser: 'cell',
      text: 'text',
      rect: 'crosshair',
      signature: 'copy',
    };
    return map[currentTool];
  };

  const toolHints: Record<Tool, string> = {
    select: '🖐 Klik anotasi untuk memilih, drag untuk pindahkan • Delete/Backspace untuk hapus',
    pen: '✏️ Klik & drag untuk menggambar bebas',
    eraser: '⬜ Klik & drag untuk menutup konten dengan warna putih',
    text: '📝 Klik di halaman, ketik teks lalu Enter untuk konfirmasi',
    rect: '▭ Klik & drag untuk membuat kotak (putih = tutup teks)',
    signature: '✍️ Klik di halaman untuk menempatkan tanda tangan',
  };

  const toolList: { tool: Tool; icon: string; label: string }[] = [
    { tool: 'select', icon: '🖐', label: 'Pilih' },
    { tool: 'pen', icon: '✏️', label: 'Pen' },
    { tool: 'eraser', icon: '⬜', label: 'Eraser' },
    { tool: 'text', icon: 'T', label: 'Teks' },
    { tool: 'rect', icon: '▭', label: 'Kotak' },
    { tool: 'signature', icon: '✍️', label: 'Ttd' },
  ];

  return (
    <div className={styles.container}>
      {/* Top Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarInfo}>
          <span className={styles.toolbarTitle}>✍️ PDF Annotator</span>
          <span className={styles.fileInfo}>{file.name}</span>
        </div>

        <div className={styles.toolGroup}>
          {toolList.map(({ tool, icon, label }) => (
            <button
              key={tool}
              className={`${styles.toolBtn} ${currentTool === tool ? styles.activeTool : ''}`}
              onClick={() => setCurrentTool(tool)}
              title={toolHints[tool]}
            >
              <span className={styles.toolIcon}>{icon}</span>
              <span className={styles.toolLabel}>{label}</span>
            </button>
          ))}
        </div>

        {/* Tool-specific options */}
        <div className={styles.optionsGroup}>
          {currentTool === 'select' && selectedAnnId && (
            <button className={styles.deleteSelectedBtn} onClick={handleDeleteSelected} title="Hapus anotasi terpilih">
              🗑 Hapus
            </button>
          )}
          {currentTool === 'pen' && (
            <>
              <label className={styles.optLabel}>Warna</label>
              <input type="color" value={penColor} onChange={(e) => setPenColor(e.target.value)} className={styles.colorPicker} />
              <label className={styles.optLabel}>Tebal</label>
              <input type="range" min={1} max={30} value={penWidth} onChange={(e) => setPenWidth(Number(e.target.value))} className={styles.slider} />
              <span className={styles.optVal}>{penWidth}px</span>
            </>
          )}
          {currentTool === 'eraser' && (
            <>
              <label className={styles.optLabel}>Ukuran</label>
              <input type="range" min={5} max={60} value={eraserWidth} onChange={(e) => setEraserWidth(Number(e.target.value))} className={styles.slider} />
              <span className={styles.optVal}>{eraserWidth}px</span>
            </>
          )}
          {currentTool === 'text' && (
            <>
              <label className={styles.optLabel}>Warna</label>
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className={styles.colorPicker} />
              <label className={styles.optLabel}>Ukuran</label>
              <input type="range" min={8} max={72} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className={styles.slider} />
              <span className={styles.optVal}>{fontSize}px</span>
            </>
          )}
          {currentTool === 'rect' && (
            <>
              <label className={styles.optLabel}>Warna</label>
              <input type="color" value={rectColor} onChange={(e) => setRectColor(e.target.value)} className={styles.colorPicker} />
              <button className={styles.whiteBtn} onClick={() => setRectColor('#ffffff')}>Putih</button>
            </>
          )}
        </div>

        <div className={styles.actionGroup}>
          <button className={styles.undoBtn} onClick={handleUndo} disabled={annotations.length === 0} title="Undo">
            ↩ Undo
          </button>
          <button className={styles.clearBtn} onClick={handleClearAll} disabled={annotations.length === 0} title="Hapus semua">
            🗑
          </button>
          <button className={styles.cancelBtn} onClick={onCancel}>Batal</button>
          <button className={styles.applyBtn} onClick={handleApply} disabled={saving}>
            {saving ? <><span className={styles.spinner} /> Menyimpan...</> : '✓ Apply & Download'}
          </button>
        </div>
      </div>

      {/* Hint bar */}
      <div className={styles.hintBar}>
        <span>{toolHints[currentTool]}</span>
        <span className={styles.annCount}>
          {annotations.length} anotasi{annotations.length > 0 && ' • Klik "Apply & Download" untuk simpan ke PDF'}
        </span>
      </div>

      {/* Pages */}
      <div className={styles.pagesArea}>
        {fileUrl && (
          <Document
            file={fileUrl}
            onLoadSuccess={async (pdf) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const total = (pdf as any).numPages as number;
              setNumPages(total);
              const sizes: { [page: number]: { width: number; height: number } } = {};
              for (let i = 1; i <= total; i++) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const page = await (pdf as any).getPage(i);
                const pdfW = page.view[2] as number;
                const pdfH = page.view[3] as number;
                sizes[i] = { width: PAGE_WIDTH, height: Math.round(PAGE_WIDTH * (pdfH / pdfW)) };
              }
              setPageRenderSizes(sizes);
            }}
            className={styles.document}
          >
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
              <div key={pageNum} className={styles.pageWrapper}>
                <div className={styles.pageLabel}>Halaman {pageNum}</div>
                <div className={styles.pageInner}>
                  <Page
                    pageNumber={pageNum}
                    width={PAGE_WIDTH}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                  {pageRenderSizes[pageNum] && (
                    <canvas
                      ref={(el) => { canvasRefs.current[pageNum] = el; }}
                      width={pageRenderSizes[pageNum].width}
                      height={pageRenderSizes[pageNum].height}
                      className={styles.annotCanvas}
                      style={{ cursor: getCursor() }}
                      onMouseDown={(e) => handleMouseDown(e, pageNum)}
                      onMouseMove={(e) => handleMouseMove(e, pageNum)}
                      onMouseUp={(e) => handleMouseUp(e, pageNum)}
                      onMouseLeave={(e) => handleMouseUp(e, pageNum)}
                    />
                  )}
                  {/* Text input overlay */}
                  {textInput && textInput.page === pageNum && pageRenderSizes[pageNum] && (
                    <div
                      className={styles.textInputWrapper}
                      style={{
                        left: textInput.xRatio * pageRenderSizes[pageNum].width,
                        top: textInput.yRatio * pageRenderSizes[pageNum].height,
                      }}
                    >
                      <input
                        ref={textInputRef}
                        className={styles.textInputField}
                        style={{ fontSize: `${fontSize}px`, color: textColor }}
                        value={textInput.value}
                        onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter') confirmText();
                          if (e.key === 'Escape') setTextInput(null);
                        }}
                        placeholder="Ketik teks..."
                      />
                      <button className={styles.textConfirmBtn} onMouseDown={(e) => { e.preventDefault(); confirmText(); }}>✓</button>
                      <button className={styles.textCancelBtn} onMouseDown={(e) => { e.preventDefault(); setTextInput(null); }}>×</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </Document>
        )}
      </div>

      {/* Signature Drawer Modal */}
      {showSigDrawer && (
        <SignatureDrawer
          onConfirm={handleSignatureConfirm}
          onClose={() => { setShowSigDrawer(false); setPendingPos(null); }}
        />
      )}
    </div>
  );
}
