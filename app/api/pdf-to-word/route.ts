import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, rm, readFile } from "fs/promises";
import { join, basename, extname } from "path";
import { tmpdir } from "os";
import { v4 as uuidv4 } from "uuid";
import { validatePDFFiles } from "@/lib/file-validator";
import { analyzePDFComplexity } from "@/lib/pdf-processor";
import { checkRateLimit, getClientIP } from "@/lib/rate-limiter";
import { PythonShell } from "python-shell";

const PYTHON_PATH =
  process.env.PYTHON_PATH ||
  "C:\\Users\\firma\\AppData\\Local\\Microsoft\\WindowsApps\\python.exe";

async function convertWithPython(inputPath: string, outputPath: string): Promise<void> {
  const scriptPath = join(process.cwd(), "scripts", "pdf_to_word.py");
  await PythonShell.run(scriptPath, {
    pythonPath: PYTHON_PATH,
    args: [inputPath, outputPath],
    pythonOptions: ["-u"],
  });
}

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

    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const inputPath = join(sessionDir, "input.pdf");
    const outputPath = join(sessionDir, "output.docx");

    await writeFile(inputPath, pdfBuffer);

    // Run complexity analysis and Python conversion in parallel
    const [analysis] = await Promise.all([
      analyzePDFComplexity(inputPath),
      convertWithPython(inputPath, outputPath),
    ]);

    const docxBuffer = await readFile(outputPath);
    const outputName = basename(file.name, extname(file.name)) + ".docx";

    return new NextResponse(new Uint8Array(docxBuffer), {
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
