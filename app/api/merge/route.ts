import { NextRequest, NextResponse } from "next/server";
import {
  createSessionFolder,
  saveUploadedFile,
  deleteSessionFolder,
} from "@/lib/temp-manager";
import { validatePDFFiles } from "@/lib/file-validator";
import { mergePDFs } from "@/lib/pdf-processor";
import { checkRateLimit, getClientIP } from "@/lib/rate-limiter";
import path from "path";
import fs from "fs/promises";

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(clientIP);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(rateLimit.resetTime).toISOString(),
        },
      },
    );
  }

  let sessionId: string | null = null;

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    // Validate files
    const validation = await validatePDFFiles(files);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Create session folder
    const session = await createSessionFolder();
    sessionId = session.sessionId;

    // Save uploaded files
    const filePaths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = await saveUploadedFile(
        sessionId,
        file,
        `input_${i + 1}.pdf`,
      );
      filePaths.push(filePath);
    }

    // Merge PDFs
    const outputPath = path.join(session.path, "merged.pdf");
    await mergePDFs(filePaths, outputPath);

    // Read the merged PDF
    const mergedPdfBuffer = await fs.readFile(outputPath);

    // Clean up session folder
    await deleteSessionFolder(sessionId);

    // Return the merged PDF
    return new NextResponse(mergedPdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="merged.pdf"',
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
      },
    });
  } catch (error) {
    // Clean up on error
    if (sessionId) {
      await deleteSessionFolder(sessionId);
    }

    console.error("Merge PDF error:", error);
    return NextResponse.json(
      { error: "Failed to merge PDFs. Please try again." },
      { status: 500 },
    );
  }
}
