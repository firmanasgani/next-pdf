import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, mkdir, rm, stat, readdir } from "fs/promises";
import { join, basename } from "path";
import { tmpdir } from "os";
import { v4 as uuidv4 } from "uuid";
import { validatePDFFiles } from "@/lib/file-validator";
import { analyzePDFComplexity } from "@/lib/pdf-processor";
import { checkRateLimit, getClientIP } from "@/lib/rate-limiter";

const execAsync = promisify(exec);

const LIBREOFFICE_TIMEOUT_MS = 120_000;

// ── Detect the LibreOffice executable name ────────────────────────────────────
// Windows may expose it as "soffice.exe"; Linux/Mac as "soffice" or "libreoffice".
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
    "Please install LibreOffice on the server."
  );
}

// ── Find the .docx output LibreOffice produced ────────────────────────────────
// LibreOffice names the output after the input file. We scan the directory
// in case the basename is slightly different from what we expect.
async function findDocxOutput(dir: string): Promise<string> {
  const files = await readdir(dir);
  const docx = files.find((f) => f.toLowerCase().endsWith(".docx"));
  if (!docx) {
    throw new Error(
      "LibreOffice ran but produced no .docx file. " +
      `Files in session dir: [${files.join(", ")}]`
    );
  }
  return join(dir, docx);
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

    // Save input — use original filename so LibreOffice output is predictable
    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const inputPath = join(sessionDir, safeName);
    await writeFile(inputPath, new Uint8Array(await file.arrayBuffer()));

    // Analyse complexity for quality score
    const analysis = await analyzePDFComplexity(inputPath);

    // ── Verify LibreOffice is available ──────────────────────────────────────
    const soffice = await findSoffice();

    // ── Run conversion ───────────────────────────────────────────────────────
    //
    // Flags explained:
    //   --headless        : no GUI
    //   --norestore       : skip session-restore dialog (critical on servers)
    //   --nofirststartwizard : skip first-run wizard
    //   --convert-to docx : target format
    //   --outdir          : where to place the output file
    //
    // NOTE: --infilter is intentionally omitted. It is designed for GUI mode
    // and causes LibreOffice to emit an empty document in headless --convert-to
    // mode without raising an error.
    //
    const { stdout, stderr } = await execAsync(
      `"${soffice}" --headless --norestore --nofirststartwizard --convert-to docx --outdir "${sessionDir}" "${inputPath}"`,
      { timeout: LIBREOFFICE_TIMEOUT_MS },
    );

    if (stderr) console.warn("[pdf-to-word] LibreOffice stderr:", stderr);
    if (stdout) console.log("[pdf-to-word] LibreOffice stdout:", stdout);

    // ── Find and validate output ─────────────────────────────────────────────
    const outputPath = await findDocxOutput(sessionDir);

    const outputStat = await stat(outputPath);
    if (outputStat.size === 0) {
      throw new Error(
        "LibreOffice produced an empty .docx. " +
        "The PDF may be password-protected or contain no extractable content."
      );
    }

    const docxBytes = await readFile(outputPath);
    const outputName = basename(file.name, ".pdf") + ".docx";

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
