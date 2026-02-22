import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const TEMP_BASE_DIR = path.join(process.cwd(), 'temp');
const TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface SessionFolder {
  sessionId: string;
  path: string;
}

/**
 * Create a temporary folder for a session
 */
export async function createSessionFolder(): Promise<SessionFolder> {
  const sessionId = uuidv4();
  const sessionPath = path.join(TEMP_BASE_DIR, sessionId);
  
  await fs.mkdir(sessionPath, { recursive: true });
  
  return {
    sessionId,
    path: sessionPath,
  };
}

/**
 * Get session folder path
 */
export function getSessionPath(sessionId: string): string {
  return path.join(TEMP_BASE_DIR, sessionId);
}

/**
 * Delete a session folder and all its contents
 */
export async function deleteSessionFolder(sessionId: string): Promise<void> {
  const sessionPath = getSessionPath(sessionId);
  
  try {
    await fs.rm(sessionPath, { recursive: true, force: true });
  } catch (error) {
    console.error(`Failed to delete session folder ${sessionId}:`, error);
  }
}

/**
 * Clean up expired session folders (TTL-based cleanup)
 */
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    await fs.mkdir(TEMP_BASE_DIR, { recursive: true });
    const entries = await fs.readdir(TEMP_BASE_DIR, { withFileTypes: true });
    const now = Date.now();
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const folderPath = path.join(TEMP_BASE_DIR, entry.name);
        const stats = await fs.stat(folderPath);
        const age = now - stats.mtimeMs;
        
        if (age > TTL_MS) {
          await fs.rm(folderPath, { recursive: true, force: true });
          console.log(`Cleaned up expired session: ${entry.name}`);
        }
      }
    }
  } catch (error) {
    console.error('Failed to cleanup expired sessions:', error);
  }
}

/**
 * Initialize temp directory
 */
export async function initTempDirectory(): Promise<void> {
  await fs.mkdir(TEMP_BASE_DIR, { recursive: true });
}

/**
 * Save uploaded file to session folder
 */
export async function saveUploadedFile(
  sessionId: string,
  file: File,
  filename?: string
): Promise<string> {
  const sessionPath = getSessionPath(sessionId);
  const fileName = filename || `${uuidv4()}.pdf`;
  const filePath = path.join(sessionPath, fileName);
  
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);
  
  return filePath;
}

/**
 * Validate path to prevent path traversal attacks
 */
export function validatePath(sessionId: string, filename: string): boolean {
  const sessionPath = getSessionPath(sessionId);
  const fullPath = path.resolve(sessionPath, filename);
  
  // Ensure the resolved path is within the session folder
  return fullPath.startsWith(sessionPath);
}
