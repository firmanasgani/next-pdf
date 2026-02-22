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
