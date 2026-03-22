import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts, LineCapStyle } from 'pdf-lib';

interface DrawPoint {
  xRatio: number;
  yRatio: number;
}

interface Annotation {
  id: string;
  type: 'pen' | 'eraser' | 'text' | 'rect' | 'signature';
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

// Canvas render width used by the frontend
const CANVAS_WIDTH = 650;

function hexToRgb(hex: string) {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;
  return rgb(
    isNaN(r) ? 0 : r,
    isNaN(g) ? 0 : g,
    isNaN(b) ? 0 : b
  );
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const annotationsRaw = formData.get('annotations') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File PDF diperlukan' }, { status: 400 });
    }
    if (!annotationsRaw) {
      return NextResponse.json({ error: 'Data anotasi diperlukan' }, { status: 400 });
    }

    const annotations: Annotation[] = JSON.parse(annotationsRaw);

    const pdfBytes = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(new Uint8Array(pdfBytes));

    let helvetica;
    try {
      helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    } catch {
      helvetica = await pdfDoc.embedFont(StandardFonts.Courier);
    }

    // Cache for embedded images (avoid re-embedding same signature)
    const embeddedImgCache: { [id: string]: Awaited<ReturnType<typeof pdfDoc.embedPng>> } = {};

    for (const ann of annotations) {
      const pageIndex = ann.page - 1;
      if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) continue;

      const page = pdfDoc.getPage(pageIndex);
      const { width: pdfW, height: pdfH } = page.getSize();

      // Scale factor: frontend canvas width → PDF page width (points)
      const scale = pdfW / CANVAS_WIDTH;

      // Convert canvas ratios to PDF coordinates
      // PDF origin: bottom-left. Canvas origin: top-left → flip Y axis
      const pdfX = ann.xRatio * pdfW;
      const pdfYFromTop = ann.yRatio * pdfH; // distance from top in PDF units
      const pdfY = pdfH - pdfYFromTop;       // PDF y from bottom

      try {
        switch (ann.type) {
          case 'pen':
          case 'eraser': {
            const pts = ann.points;
            if (!pts || pts.length < 2) break;

            const strokeColor =
              ann.type === 'eraser'
                ? rgb(1, 1, 1)
                : ann.strokeColor
                ? hexToRgb(ann.strokeColor)
                : rgb(0, 0, 0);

            const thickness = Math.max(0.5, (ann.strokeWidth ?? 2) * scale);

            for (let i = 0; i < pts.length - 1; i++) {
              const p1 = pts[i];
              const p2 = pts[i + 1];
              page.drawLine({
                start: {
                  x: p1.xRatio * pdfW,
                  y: pdfH - p1.yRatio * pdfH,
                },
                end: {
                  x: p2.xRatio * pdfW,
                  y: pdfH - p2.yRatio * pdfH,
                },
                thickness,
                color: strokeColor,
                lineCap: LineCapStyle.Round,
              });
            }
            break;
          }

          case 'rect': {
            const w = (ann.wRatio ?? 0) * pdfW;
            const h = (ann.hRatio ?? 0) * pdfH;
            if (w <= 0 || h <= 0) break;

            const fillColor = ann.color ? hexToRgb(ann.color) : rgb(1, 1, 1);
            // In PDF, y is bottom-left of the rectangle
            const rectY = pdfH - ann.yRatio * pdfH - h;

            page.drawRectangle({
              x: pdfX,
              y: rectY,
              width: w,
              height: h,
              color: fillColor,
              borderWidth: 0,
            });
            break;
          }

          case 'text': {
            if (!ann.text || !ann.text.trim()) break;

            const pdfFontSize = Math.max(4, (ann.fontSize ?? 16) * scale);
            const textColor = ann.color ? hexToRgb(ann.color) : rgb(0, 0, 0);

            // yRatio is where user clicked (top of text). In canvas, text is drawn
            // with baseline at yRatio*H + fontSize. Convert baseline to PDF y:
            const baselineY = pdfH - (ann.yRatio * pdfH + pdfFontSize);

            // Sanitize: only keep characters in WinAnsi encoding (latin-1 range)
            const safeText = ann.text
              .split('')
              .filter((ch) => ch.charCodeAt(0) < 256)
              .join('');

            if (!safeText) break;

            page.drawText(safeText, {
              x: pdfX,
              y: baselineY,
              size: pdfFontSize,
              font: helvetica,
              color: textColor,
            });
            break;
          }

          case 'signature': {
            if (!ann.imageData) break;

            const w = (ann.wRatio ?? 0.28) * pdfW;
            const h = (ann.hRatio ?? 0.1) * pdfH;
            if (w <= 0 || h <= 0) break;

            const imgY = pdfH - ann.yRatio * pdfH - h;

            let embeddedImg = embeddedImgCache[ann.id];
            if (!embeddedImg) {
              const base64Data = ann.imageData.split(',')[1];
              if (!base64Data) break;
              const imgBytes = Buffer.from(base64Data, 'base64');
              const isJpeg =
                ann.imageData.startsWith('data:image/jpeg') ||
                ann.imageData.startsWith('data:image/jpg');

              embeddedImg = isJpeg
                ? await pdfDoc.embedJpg(imgBytes)
                : await pdfDoc.embedPng(imgBytes);
              embeddedImgCache[ann.id] = embeddedImg;
            }

            page.drawImage(embeddedImg, {
              x: pdfX,
              y: imgY,
              width: w,
              height: h,
            });
            break;
          }
        }
      } catch (annErr) {
        // Skip this annotation if it fails, continue with others
        console.error(`Annotation ${ann.id} failed:`, annErr);
      }
    }

    const modifiedBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(modifiedBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="annotated_${file.name}"`,
      },
    });
  } catch (err) {
    console.error('Annotate API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
