import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join, basename } from "path";
import { tmpdir } from "os";
import { v4 as uuidv4 } from "uuid";
import { validatePDFFiles } from "@/lib/file-validator";
import { analyzePDFComplexity } from "@/lib/pdf-processor";
import { checkRateLimit, getClientIP } from "@/lib/rate-limiter";

const execAsync = promisify(exec);

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

    // Analyse complexity before conversion so we can return the score
    const analysis = await analyzePDFComplexity(inputPath);

    // Convert PDF → DOCX via LibreOffice
    // The "writer_pdf_import" filter tells LibreOffice to open the PDF
    // in Writer mode (text-aware import) rather than as an image.
    await execAsync(
      `soffice --headless --infilter="writer_pdf_import" --convert-to docx --outdir "${sessionDir}" "${inputPath}"`,
    );

    const outputPath = join(sessionDir, "input.docx");
    const docxBytes = await readFile(outputPath);
    const outputName = basename(file.name, ".pdf") + ".docx";

    return new NextResponse(docxBytes, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${outputName}"`,
        // Expose conversion quality metadata to the client
        "X-Conversion-Score": analysis.estimatedScore.toString(),
        "X-Conversion-Quality": analysis.qualityLabel,
        "X-Conversion-Notes": analysis.notes,
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        // Required so the browser can read custom headers in fetch()
        "Access-Control-Expose-Headers":
          "X-Conversion-Score, X-Conversion-Quality, X-Conversion-Notes",
      },
    });
  } catch (error) {
    console.error("PDF to Word error:", error);
    return NextResponse.json(
      {
        error:
          "Conversion failed. Make sure LibreOffice is installed on the server.",
      },
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
