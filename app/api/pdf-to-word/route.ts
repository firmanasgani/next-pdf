import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, mkdir, rm, stat } from "fs/promises";
import { join, basename } from "path";
import { tmpdir } from "os";
import { v4 as uuidv4 } from "uuid";
import { validatePDFFiles } from "@/lib/file-validator";
import { analyzePDFComplexity } from "@/lib/pdf-processor";
import { checkRateLimit, getClientIP } from "@/lib/rate-limiter";

const execAsync = promisify(exec);

// LibreOffice can be slow on first run — give it up to 90 seconds
const LIBREOFFICE_TIMEOUT_MS = 90_000;

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

    // Validate as PDF
    const validation = await validatePDFFiles([file]);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const inputPath = join(sessionDir, "input.pdf");
    await writeFile(inputPath, new Uint8Array(await file.arrayBuffer()));

    // Analyse complexity so we can return an estimated quality score
    const analysis = await analyzePDFComplexity(inputPath);

    // ── Convert PDF → DOCX via LibreOffice ───────────────────────────────────
    //
    // NOTE: Do NOT pass --infilter here. The "writer_pdf_import" infilter is
    // designed for the GUI and is incompatible with headless --convert-to mode
    // — it causes LibreOffice to emit an empty document without an error code.
    //
    // Without --infilter, LibreOffice uses its built-in Draw/PDF import which
    // correctly embeds text and vector shapes, producing a non-empty .docx.
    //
    await execAsync(
      `soffice --headless --convert-to docx --outdir "${sessionDir}" "${inputPath}"`,
      { timeout: LIBREOFFICE_TIMEOUT_MS },
    );

    const outputPath = join(sessionDir, "input.docx");

    // Guard: make sure LibreOffice actually produced a non-empty file
    let outputStat;
    try {
      outputStat = await stat(outputPath);
    } catch {
      throw new Error(
        "LibreOffice did not produce an output file. " +
        "The PDF may be corrupted, password-protected, or LibreOffice is not installed.",
      );
    }

    if (outputStat.size === 0) {
      throw new Error(
        "LibreOffice produced an empty file. " +
        "The PDF may be password-protected or contain no extractable content.",
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
    console.error("PDF to Word error:", error);

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
      // Best-effort cleanup — do not propagate
    }
  }
}
