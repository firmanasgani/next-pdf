/**
 * PDF → DOCX conversion without LibreOffice.
 *
 * Strategy:
 *   1. Extract text (and basic layout) from the PDF with pdfjs-dist.
 *   2. Construct a valid DOCX (ZIP + XML) with archiver.
 *
 * This runs entirely in Node.js — no Java, no LibreOffice export filters needed.
 */

import archiver from "archiver";
import { Writable } from "stream";
import type * as PdfjsLib from "pdfjs-dist";

// pdfjs-dist is loaded at runtime via the legacy build (Node.js compatible).
// The main build requires browser APIs (DOMMatrix, etc.) which are absent in Node.js.
// Loaded lazily inside the function so Next.js never tries to bundle it at build time.
async function getPdfjs(): Promise<typeof PdfjsLib> {
  const lib = await import(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore – no type declarations at this sub-path; we cast below
    "pdfjs-dist/legacy/build/pdf.mjs"
  );
  // Disable Web Worker — not available in Node.js
  (lib as typeof PdfjsLib).GlobalWorkerOptions.workerSrc = "";
  return lib as typeof PdfjsLib;
}

// ─────────────────────────────────────────────────────────────────────────────
// Text extraction
// ─────────────────────────────────────────────────────────────────────────────

interface RawTextItem {
  str: string;
  transform: number[]; // [a, b, c, d, x, y]  (e = x, f = y)
}

/**
 * Reconstruct reading-order text for a single PDF page.
 *
 * Algorithm:
 *  - Group text items by rounded Y position → lines
 *  - Sort lines top-to-bottom (PDF coords are bottom-up, so descending Y)
 *  - Sort items within each line left-to-right
 *  - Insert blank line when vertical gap > threshold (paragraph break)
 */
function reconstructPageText(items: RawTextItem[]): string {
  if (items.length === 0) return "";

  const lineMap = new Map<number, { x: number; text: string }[]>();

  for (const item of items) {
    if (!item.str) continue;
    const y = Math.round(item.transform[5]); // round to 1px bucket
    const x = item.transform[4];
    if (!lineMap.has(y)) lineMap.set(y, []);
    lineMap.get(y)!.push({ x, text: item.str });
  }

  const sortedLines = Array.from(lineMap.entries())
    .sort(([a], [b]) => b - a) // descending Y → top to bottom
    .map(([y, items]) => ({
      y,
      text: items
        .sort((a, b) => a.x - b.x)
        .map((i) => i.text)
        .join(""),
    }));

  const paragraphs: string[] = [];
  let prevY: number | null = null;

  for (const { y, text } of sortedLines) {
    const trimmed = text.trim();
    if (!trimmed) continue;

    if (prevY !== null && prevY - y > 14) {
      paragraphs.push(""); // blank line = paragraph separator
    }

    paragraphs.push(trimmed);
    prevY = y;
  }

  return paragraphs.join("\n");
}

/**
 * Extract text from every page of a PDF buffer.
 * Returns one string per page.
 */
export async function extractPagesFromPDF(pdfBuffer: Buffer): Promise<string[]> {
  const { getDocument } = await getPdfjs();

  const pdf = await getDocument({
    data: new Uint8Array(pdfBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pages: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const text = reconstructPageText(content.items as RawTextItem[]);
    pages.push(text);
  }

  return pages;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCX builder (OOXML / ZIP)
// ─────────────────────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toParagraphXml(text: string): string {
  if (!text.trim()) return "<w:p/>";
  return (
    `<w:p>` +
    `<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>` +
    `</w:p>`
  );
}

const PAGE_BREAK_XML =
  `<w:p><w:r><w:lastRenderedPageBreak/><w:br w:type="page"/></w:r></w:p>`;

function buildDocumentXml(pages: string[]): string {
  const bodyContent = pages
    .map((pageText, idx) => {
      const paragraphs = pageText.split("\n").map(toParagraphXml).join("\n");
      const pageBreak = idx < pages.length - 1 ? `\n${PAGE_BREAK_XML}` : "";
      return `${paragraphs}${pageBreak}`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyContent}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

// Static OOXML supporting files
const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const PACKAGE_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
</Relationships>`;

const DOCUMENT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"
    Target="styles.xml"/>
</Relationships>`;

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Arial"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:lang w:val="en-US" w:eastAsia="en-US" w:bidi="ar-SA"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="120" w:line="276" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`;

/**
 * Pack extracted page texts into a valid .docx Buffer.
 */
export async function buildDocxBuffer(pages: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const output = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        cb();
      },
    });

    output.on("finish", () => resolve(Buffer.concat(chunks)));
    output.on("error", reject);

    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.pipe(output);
    archive.on("error", reject);

    const entries: [string, string][] = [
      ["[Content_Types].xml", CONTENT_TYPES_XML],
      ["_rels/.rels", PACKAGE_RELS_XML],
      ["word/_rels/document.xml.rels", DOCUMENT_RELS_XML],
      ["word/document.xml", buildDocumentXml(pages)],
      ["word/styles.xml", STYLES_XML],
    ];

    for (const [name, content] of entries) {
      archive.append(Buffer.from(content, "utf-8"), { name });
    }

    archive.finalize();
  });
}
