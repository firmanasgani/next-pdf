import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, mkdir, rm, stat, readdir } from "fs/promises";
import { join, basename, extname } from "path";
import { tmpdir } from "os";
import { v4 as uuidv4 } from "uuid";
import { validatePDFFiles } from "@/lib/file-validator";
import { analyzePDFComplexity } from "@/lib/pdf-processor";
import { checkRateLimit, getClientIP } from "@/lib/rate-limiter";

const execAsync = promisify(exec);

// LibreOffice can be slow on cold start; allow enough headroom per step.
const LIBREOFFICE_TIMEOUT_MS = 90_000;

// ── Detect the LibreOffice executable ─────────────────────────────────────────
async function findSoffice(): Promise<string> {
  for (const cmd of ["soffice", "libreoffice", "soffice.exe"]) {
    try {
      await execAsync(`${cmd} --version`);
      return cmd;
    } catch {
      // not found, try next
    }
  }
  throw new Error(
    "LibreOffice is not installed or not in PATH. " +
      "Please install LibreOffice on the server.",
  );
}

// ── Run one headless conversion step ──────────────────────────────────────────
async function runConvert(
  soffice: string,
  format: string,
  outDir: string,
  inputFile: string,
): Promise<void> {
  const { stderr } = await execAsync(
    // --norestore       : skip crash-recovery dialog (critical on servers)
    // --nofirststartwizard : skip first-run wizard
    `"${soffice}" --headless --norestore --nofirststartwizard --convert-to ${format} --outdir "${outDir}" "${inputFile}"`,
    { timeout: LIBREOFFICE_TIMEOUT_MS },
  );

  if (stderr) console.warn(`[pdf-to-word] LibreOffice (${format}) stderr:`, stderr);
}

// ── Find a file by extension in a directory ────────────────────────────────────
async function findByExt(dir: string, ext: string): Promise<string> {
  const files = await readdir(dir);
  const found = files.find((f) => f.toLowerCase().endsWith(ext));
  if (!found) {
    throw new Error(
      `LibreOffice produced no ${ext} file. ` +
        `Files in session dir: [${files.join(", ")}]`,
    );
  }
  return join(dir, found);
}

// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(clientIP);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 },
    );
  }

  const sessionDir = join(tmpdir(), `nextpdf-pdf2word-${uuidv4()}`);

  try {
    await mkdir(sessionDir, { recursive: true });

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validation = await validatePDFFiles([file]);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Use the original filename so LibreOffice output names are predictable.
    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const inputPath = join(sessionDir, safeName);
    await writeFile(inputPath, new Uint8Array(await file.arrayBuffer()));

    // Analyse complexity for quality score (runs before conversion).
    const analysis = await analyzePDFComplexity(inputPath);

    // Verify LibreOffice is available.
    const soffice = await findSoffice();

    // ── Two-step conversion: PDF → ODT → DOCX ────────────────────────────────
    //
    // Why two steps?
    //   LibreOffice's PDF import module can write to its native ODT format
    //   (step 1) but does not expose a direct DOCX export filter when the
    //   source is a PDF (hence the "no export filter for .docx" error in a
    //   single-step approach).
    //
    //   Converting ODT → DOCX (step 2) is a standard LibreOffice operation
    //   that is always available on any complete installation.
    //

    // Step 1: PDF → ODT
    await runConvert(soffice, "odt", sessionDir, inputPath);
    const odtPath = await findByExt(sessionDir, ".odt");

    // Step 2: ODT → DOCX
    await runConvert(soffice, "docx", sessionDir, odtPath);
    const docxPath = await findByExt(sessionDir, ".docx");

    // Guard: ensure the output is not empty.
    const { size } = await stat(docxPath);
    if (size === 0) {
      throw new Error(
        "LibreOffice produced an empty .docx file. " +
          "The PDF may be password-protected or contain no extractable content.",
      );
    }

    const docxBytes = await readFile(docxPath);
    const outputName = basename(file.name, extname(file.name)) + ".docx";

    return new NextResponse(docxBytes, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${outputName}"`,
        "X-Conversion-Score": analysis.estimatedScore.toString(),
        "X-Conversion-Quality": analysis.qualityLabel,
        "X-Conversion-Notes": analysis.notes,
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        "Access-Control-Expose-Headers":
          "X-Conversion-Score, X-Conversion-Quality, X-Conversion-Notes",
      },
    });
  } catch (error) {
    console.error("[pdf-to-word] Error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error occurred.";

    return NextResponse.json(
      { error: `Conversion failed: ${message}` },
      { status: 500 },
    );
  } finally {
    try {
      await rm(sessionDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  }
}
