import { PDFDocument, degrees } from "pdf-lib";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Merge multiple PDF files into one
 */
export async function mergePDFs(
  inputPaths: string[],
  outputPath: string,
): Promise<void> {
  const mergedPdf = await PDFDocument.create();

  for (const inputPath of inputPaths) {
    const pdfBytes = await fs.readFile(inputPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

    copiedPages.forEach((page) => {
      mergedPdf.addPage(page);
    });
  }

  const mergedPdfBytes = await mergedPdf.save();
  await fs.writeFile(outputPath, mergedPdfBytes);
}

/**
 * Split PDF into individual pages or ranges
 */
export interface SplitRange {
  start: number; // 1-indexed
  end: number; // 1-indexed, inclusive
  outputName?: string;
}

export async function splitPDF(
  inputPath: string,
  outputDir: string,
  ranges?: SplitRange[],
): Promise<string[]> {
  const pdfBytes = await fs.readFile(inputPath);
  const pdf = await PDFDocument.load(pdfBytes);
  const totalPages = pdf.getPageCount();
  const outputPaths: string[] = [];

  if (!ranges || ranges.length === 0) {
    // Split into individual pages
    for (let i = 0; i < totalPages; i++) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(pdf, [i]);
      newPdf.addPage(copiedPage);

      const outputPath = `${outputDir}/page_${i + 1}.pdf`;
      const newPdfBytes = await newPdf.save();
      await fs.writeFile(outputPath, newPdfBytes);
      outputPaths.push(outputPath);
    }
  } else {
    // Split by ranges
    for (let rangeIndex = 0; rangeIndex < ranges.length; rangeIndex++) {
      const range = ranges[rangeIndex];
      const newPdf = await PDFDocument.create();

      // Convert 1-indexed to 0-indexed and validate
      const startIdx = Math.max(0, range.start - 1);
      const endIdx = Math.min(totalPages - 1, range.end - 1);

      const pageIndices = Array.from(
        { length: endIdx - startIdx + 1 },
        (_, i) => startIdx + i,
      );

      const copiedPages = await newPdf.copyPages(pdf, pageIndices);
      copiedPages.forEach((page) => {
        newPdf.addPage(page);
      });

      const outputName = range.outputName || `range_${rangeIndex + 1}.pdf`;
      const outputPath = `${outputDir}/${outputName}`;
      const newPdfBytes = await newPdf.save();
      await fs.writeFile(outputPath, newPdfBytes);
      outputPaths.push(outputPath);
    }
  }

  return outputPaths;
}

/**
 * Compress PDF using Ghostscript
 * Quality: 'screen' | 'ebook' | 'printer' | 'prepress'
 */
export async function compressPDF(
  inputPath: string,
  outputPath: string,
  quality: "screen" | "ebook" | "printer" | "prepress" = "ebook",
): Promise<void> {
  // Check if Ghostscript is available
  try {
    await execAsync("gs -version");
  } catch (error) {
    throw new Error(
      "Ghostscript is not installed. Please install Ghostscript to use compression feature.",
    );
  }

  const qualitySettings = {
    screen: "/screen", // 72 dpi
    ebook: "/ebook", // 150 dpi
    printer: "/printer", // 300 dpi
    prepress: "/prepress", // 300 dpi, color preserving
  };

  const gsCommand = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=${qualitySettings[quality]} -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outputPath}" "${inputPath}"`;

  try {
    await execAsync(gsCommand);
  } catch (error) {
    throw new Error(`Failed to compress PDF: ${error}`);
  }
}

/**
 * Rotate PDF pages
 */
export async function rotatePDF(
  inputPath: string,
  outputPath: string,
  pageRotations: { page: number; rotation: 90 | 180 | 270 }[],
): Promise<void> {
  const pdfBytes = await fs.readFile(inputPath);
  const pdf = await PDFDocument.load(pdfBytes);

  for (const { page, rotation } of pageRotations) {
    const pageIndex = page - 1; // Convert to 0-indexed
    if (pageIndex >= 0 && pageIndex < pdf.getPageCount()) {
      const pdfPage = pdf.getPage(pageIndex);
      pdfPage.setRotation(degrees(rotation));
    }
  }

  const rotatedPdfBytes = await pdf.save();
  await fs.writeFile(outputPath, rotatedPdfBytes);
}

/**
 * Delete specific pages from PDF
 */
export async function deletePages(
  inputPath: string,
  outputPath: string,
  pagesToDelete: number[], // 1-indexed
): Promise<void> {
  const pdfBytes = await fs.readFile(inputPath);
  const pdf = await PDFDocument.load(pdfBytes);
  const totalPages = pdf.getPageCount();

  // Convert to 0-indexed and sort in descending order
  const sortedPages = pagesToDelete
    .map((p) => p - 1)
    .filter((p) => p >= 0 && p < totalPages)
    .sort((a, b) => b - a);

  // Remove pages from end to start to avoid index shifting issues
  for (const pageIndex of sortedPages) {
    pdf.removePage(pageIndex);
  }

  const modifiedPdfBytes = await pdf.save();
  await fs.writeFile(outputPath, modifiedPdfBytes);
}

/**
 * Reorder PDF pages
 */
export async function reorderPages(
  inputPath: string,
  outputPath: string,
  pageOrder: number[], // 1-indexed array of page numbers in desired order
): Promise<void> {
  const pdfBytes = await fs.readFile(inputPath);
  const pdf = await PDFDocument.load(pdfBytes);
  const newPdf = await PDFDocument.create();

  // Convert to 0-indexed
  const pageIndices = pageOrder.map((p) => p - 1);

  // Copy pages in the specified order
  const copiedPages = await newPdf.copyPages(pdf, pageIndices);
  copiedPages.forEach((page) => {
    newPdf.addPage(page);
  });

  const reorderedPdfBytes = await newPdf.save();
  await fs.writeFile(outputPath, reorderedPdfBytes);
}

/**
 * Advanced PDF modification (delete, rotate, reorder combined)
 */
export async function modifyPDF(
  inputPath: string,
  outputPath: string,
  options: {
    pagesToDelete?: number[];
    rotations?: { page: number; rotation: 90 | 180 | 270 }[];
    reorder?: number[];
  },
): Promise<void> {
  const pdfBytes = await fs.readFile(inputPath);
  const pdf = await PDFDocument.load(pdfBytes);
  const totalPages = pdf.getPageCount();

  let pageOrder =
    options.reorder || Array.from({ length: totalPages }, (_, i) => i + 1);

  // Remove deleted pages from the order
  if (options.pagesToDelete && options.pagesToDelete.length > 0) {
    pageOrder = pageOrder.filter((p) => !options.pagesToDelete!.includes(p));
  }

  // Create new PDF with reordered pages
  const newPdf = await PDFDocument.create();
  const pageIndices = pageOrder.map((p) => p - 1);
  const copiedPages = await newPdf.copyPages(pdf, pageIndices);

  // Apply rotations
  copiedPages.forEach((page, index) => {
    const originalPageNumber = pageOrder[index];
    const rotation = options.rotations?.find(
      (r) => r.page === originalPageNumber,
    );

    if (rotation) {
      page.setRotation(degrees(rotation.rotation));
    }

    newPdf.addPage(page);
  });

  const modifiedPdfBytes = await newPdf.save();
  await fs.writeFile(outputPath, modifiedPdfBytes);
}

// ─────────────────────────────────────────────────────────────────────────────
// Merge with per-file page ranges
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a page-range string into a sorted array of 0-indexed page indices.
 *
 * Supported formats (1-indexed input):
 *   ""        → all pages
 *   "1-3"     → pages 1, 2, 3
 *   "2,4,6"   → pages 2, 4, 6
 *   "1-3,5,7-9" → pages 1,2,3,5,7,8,9
 */
export function parsePageRange(range: string, totalPages: number): number[] {
  const trimmed = range.trim();

  if (!trimmed) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const pages = new Set<number>();

  for (const segment of trimmed.split(',')) {
    const part = segment.trim();

    if (part.includes('-')) {
      const [rawStart, rawEnd] = part.split('-');
      const start = parseInt(rawStart, 10) - 1; // convert to 0-indexed
      const end = parseInt(rawEnd, 10) - 1;

      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.max(0, start); i <= Math.min(totalPages - 1, end); i++) {
          pages.add(i);
        }
      }
    } else {
      const page = parseInt(part, 10) - 1;
      if (!isNaN(page) && page >= 0 && page < totalPages) {
        pages.add(page);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Merge multiple PDF files into one, with optional per-file page ranges.
 * Files are merged in the order supplied by inputPaths.
 *
 * @param pageRanges - One range string per input file (empty string = all pages).
 */
export async function mergePDFsWithRanges(
  inputPaths: string[],
  outputPath: string,
  pageRanges: string[] = [],
): Promise<void> {
  const mergedPdf = await PDFDocument.create();

  for (let idx = 0; idx < inputPaths.length; idx++) {
    const pdfBytes = await fs.readFile(inputPaths[idx]);
    const pdf = await PDFDocument.load(pdfBytes);
    const totalPages = pdf.getPageCount();
    const range = pageRanges[idx] ?? '';
    const pageIndices = parsePageRange(range, totalPages);
    const copiedPages = await mergedPdf.copyPages(pdf, pageIndices);
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedPdfBytes = await mergedPdf.save();
  await fs.writeFile(outputPath, mergedPdfBytes);
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF complexity analysis (used for PDF → Word conversion quality estimation)
// ─────────────────────────────────────────────────────────────────────────────

export type ConversionQualityLabel = 'excellent' | 'good' | 'fair' | 'poor';

export interface PDFComplexityResult {
  pageCount: number;
  fileSizeBytes: number;
  bytesPerPage: number;
  estimatedScore: number; // 0–100
  qualityLabel: ConversionQualityLabel;
  notes: string;
}

/**
 * Estimate PDF-to-Word conversion quality by analysing bytes-per-page.
 *
 * Heuristic:
 *  < 30 KB/page  → text-heavy   → 92 %  (excellent)
 *  30–100 KB/page → light images → 74 %  (good)
 *  100–400 KB/page → heavy images → 46 % (fair)
 *  > 400 KB/page  → image-only   → 22 %  (poor)
 */
export async function analyzePDFComplexity(inputPath: string): Promise<PDFComplexityResult> {
  const pdfBytes = await fs.readFile(inputPath);
  const pdf = await PDFDocument.load(pdfBytes);

  const pageCount = pdf.getPageCount();
  const fileSizeBytes = pdfBytes.length;
  const bytesPerPage = pageCount > 0 ? Math.round(fileSizeBytes / pageCount) : fileSizeBytes;

  const KB = 1024;

  if (bytesPerPage < 30 * KB) {
    return {
      pageCount, fileSizeBytes, bytesPerPage,
      estimatedScore: 92,
      qualityLabel: 'excellent',
      notes: 'Text-heavy document with minimal images. Excellent conversion expected.',
    };
  }

  if (bytesPerPage < 100 * KB) {
    return {
      pageCount, fileSizeBytes, bytesPerPage,
      estimatedScore: 74,
      qualityLabel: 'good',
      notes: 'Moderate image content detected. Good conversion quality expected.',
    };
  }

  if (bytesPerPage < 400 * KB) {
    return {
      pageCount, fileSizeBytes, bytesPerPage,
      estimatedScore: 46,
      qualityLabel: 'fair',
      notes: 'High image content detected. Some text may be incomplete in the output.',
    };
  }

  return {
    pageCount, fileSizeBytes, bytesPerPage,
    estimatedScore: 22,
    qualityLabel: 'poor',
    notes: 'Image-heavy document. Conversion quality will be significantly limited.',
  };
}

/**
 * Get PDF metadata
 */
export async function getPDFInfo(inputPath: string): Promise<{
  pageCount: number;
  fileSize: number;
  title?: string;
  author?: string;
}> {
  const pdfBytes = await fs.readFile(inputPath);
  const pdf = await PDFDocument.load(pdfBytes);
  const stats = await fs.stat(inputPath);

  return {
    pageCount: pdf.getPageCount(),
    fileSize: stats.size,
    title: pdf.getTitle(),
    author: pdf.getAuthor(),
  };
}
