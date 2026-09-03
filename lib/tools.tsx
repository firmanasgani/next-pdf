import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Shared tool configuration — consumed by the landing page and the
// /tools/[tool] workspace so both stay in sync.
// ─────────────────────────────────────────────────────────────────────────────

export type Tool =
  | 'merge'
  | 'compress'
  | 'split'
  | 'modify'
  | 'annotate'
  | 'pdf-to-word'
  | 'word-to-pdf'
  | 'image-to-pdf'
  | 'ppt-to-pdf'
  | 'image-edit'
  | 'remove-bg';

export type Quality = 'screen' | 'ebook' | 'printer' | 'prepress';

export type ConversionQuality = 'excellent' | 'good' | 'fair' | 'poor';

export interface ToolConfig {
  label: string;
  description: string;
  icon: React.ReactNode;
  accept: string;
  multiple: boolean;
  maxFiles: number;
  fileTypeLabel: string;
}

export const toolConfig: Record<Tool, ToolConfig> = {
  merge: {
    label: 'Merge PDF',
    description: 'Combine multiple PDFs into one document',
    accept: '.pdf',
    multiple: true,
    maxFiles: 10,
    fileTypeLabel: 'PDF files · max 10 files',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
      </svg>
    ),
  },
  compress: {
    label: 'Compress PDF',
    description: 'Reduce PDF file size while preserving quality',
    accept: '.pdf',
    multiple: false,
    maxFiles: 1,
    fileTypeLabel: 'PDF files only',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    ),
  },
  split: {
    label: 'Split PDF',
    description: 'Extract pages or split into multiple files',
    accept: '.pdf',
    multiple: false,
    maxFiles: 1,
    fileTypeLabel: 'PDF files only',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
      </svg>
    ),
  },
  modify: {
    label: 'Edit PDF',
    description: 'Rotate, delete, or reorder pages',
    accept: '.pdf',
    multiple: false,
    maxFiles: 1,
    fileTypeLabel: 'PDF files only',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  annotate: {
    label: 'Annotate PDF',
    description: 'Draw, highlight, and add notes to PDF',
    accept: '.pdf',
    multiple: false,
    maxFiles: 1,
    fileTypeLabel: 'PDF files only',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
  },
  'pdf-to-word': {
    label: 'PDF → Word',
    description: 'Export PDF as an editable Word document (.docx)',
    accept: '.pdf',
    multiple: true,
    maxFiles: 20,
    fileTypeLabel: 'PDF files · max 20 files',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  'word-to-pdf': {
    label: 'Word → PDF',
    description: 'Convert Word documents (.doc, .docx) to PDF',
    accept: '.doc,.docx',
    multiple: false,
    maxFiles: 1,
    fileTypeLabel: 'Word files (.doc, .docx)',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  'image-to-pdf': {
    label: 'Image → PDF',
    description: 'Convert JPEG or PNG images to PDF',
    accept: '.jpg,.jpeg,.png,image/jpeg,image/png',
    multiple: true,
    maxFiles: 20,
    fileTypeLabel: 'JPEG or PNG · max 20 images',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  'ppt-to-pdf': {
    label: 'PPT → PDF',
    description: 'Convert PowerPoint slides (.ppt, .pptx) to PDF',
    accept: '.ppt,.pptx',
    multiple: false,
    maxFiles: 1,
    fileTypeLabel: 'PowerPoint files (.ppt, .pptx)',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  'image-edit': {
    label: 'Edit Image',
    description: 'Crop, rotate, and resize images',
    accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp',
    multiple: false,
    maxFiles: 1,
    fileTypeLabel: 'JPEG, PNG, or WebP',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v14a2 2 0 002 2h14M3 6h14a2 2 0 012 2v14" />
      </svg>
    ),
  },
  'remove-bg': {
    label: 'Remove Background',
    description: 'Automatically remove the background from an image',
    accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp',
    multiple: false,
    maxFiles: 1,
    fileTypeLabel: 'JPEG, PNG, or WebP',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l-4.5 4.5m0 0L3 12m2.25 2.25L3 16.5m6.75-6.75L12 12m-2.25-2.25L12 7.5m2.25 6.75L21 21m0 0v-4.5m0 4.5H16.5m4.5-13.5L14.25 9.75" />
      </svg>
    ),
  },
};

export const toolGroups: { label: string; tools: Tool[] }[] = [
  {
    label: 'PDF Tools',
    tools: ['merge', 'compress', 'split', 'modify', 'annotate'],
  },
  {
    label: 'Export PDF',
    tools: ['pdf-to-word'],
  },
  {
    label: 'Convert to PDF',
    tools: ['word-to-pdf', 'image-to-pdf', 'ppt-to-pdf'],
  },
  {
    label: 'Image Tools',
    tools: ['image-edit', 'remove-bg'],
  },
];

export const TOOL_SLUGS = Object.keys(toolConfig) as Tool[];

export function isTool(value: string): value is Tool {
  return (TOOL_SLUGS as string[]).includes(value);
}

export const qualityMeta: Record<
  ConversionQuality,
  { color: string; bg: string; border: string; label: string }
> = {
  excellent: { color: '#065F46', bg: '#D1FAE5', border: '#6EE7B7', label: 'Excellent' },
  good: { color: '#1E40AF', bg: '#DBEAFE', border: '#93C5FD', label: 'Good' },
  fair: { color: '#92400E', bg: '#FEF3C7', border: '#FCD34D', label: 'Fair' },
  poor: { color: '#991B1B', bg: '#FEE2E2', border: '#FCA5A5', label: 'Poor' },
};
