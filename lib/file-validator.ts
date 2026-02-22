/**
 * File validation utilities
 */

const PDF_MAGIC_NUMBERS = [
  [0x25, 0x50, 0x44, 0x46], // %PDF
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILE_COUNT = 10;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate PDF file by checking magic number (file signature)
 */
export async function validatePDFFile(file: File): Promise<ValidationResult> {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      valid: false,
      error: "File is empty",
    };
  }

  // Read first 4 bytes to check magic number
  const buffer = await file.slice(0, 4).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Check if it matches PDF magic number
  const isPDF = PDF_MAGIC_NUMBERS.some((magic) =>
    magic.every((byte, index) => bytes[index] === byte),
  );

  if (!isPDF) {
    return {
      valid: false,
      error: "File is not a valid PDF (invalid file signature)",
    };
  }

  return { valid: true };
}

/**
 * Validate multiple PDF files
 */
export async function validatePDFFiles(
  files: File[],
): Promise<ValidationResult> {
  // Check file count
  if (files.length > MAX_FILE_COUNT) {
    return {
      valid: false,
      error: `Maximum ${MAX_FILE_COUNT} files allowed`,
    };
  }

  if (files.length === 0) {
    return {
      valid: false,
      error: "No files provided",
    };
  }

  // Validate each file
  for (const file of files) {
    const result = await validatePDFFile(file);
    if (!result.valid) {
      return {
        valid: false,
        error: `${file.name}: ${result.error}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  return filename
    .slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2)
    .toLowerCase();
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and special characters
  return filename
    .replace(/[/\\]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .substring(0, 255);
}
