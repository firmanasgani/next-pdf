import { NextRequest, NextResponse } from "next/server";
import {
  createSessionFolder,
  saveUploadedFile,
  deleteSessionFolder,
} from "@/lib/temp-manager";
import { validatePDFFile } from "@/lib/file-validator";
import { compressPDF, getPDFInfo } from "@/lib/pdf-processor";
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
    const file = formData.get("file") as File;
    const quality = (formData.get("quality") as string) || "ebook";

    // Validate quality parameter
    if (!["screen", "ebook", "printer", "prepress"].includes(quality)) {
      return NextResponse.json(
        {
          error:
            "Invalid quality parameter. Must be: screen, ebook, printer, or prepress",
        },
        { status: 400 },
      );
    }

    // Validate file
    const validation = await validatePDFFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Create session folder
    const session = await createSessionFolder();
    sessionId = session.sessionId;

    // Save uploaded file
    const inputPath = await saveUploadedFile(sessionId, file, "input.pdf");

    // Get original file info
    const originalInfo = await getPDFInfo(inputPath);

    // Compress PDF
    const outputPath = path.join(session.path, "compressed.pdf");
    await compressPDF(
      inputPath,
      outputPath,
      quality as "screen" | "ebook" | "printer" | "prepress",
    );

    // Get compressed file info
    const compressedInfo = await getPDFInfo(outputPath);

    // Calculate compression ratio
    const compressionRatio = (
      ((originalInfo.fileSize - compressedInfo.fileSize) /
        originalInfo.fileSize) *
      100
    ).toFixed(2);

    // Read the compressed PDF
    const compressedPdfBuffer = await fs.readFile(outputPath);

    // Clean up session folder
    await deleteSessionFolder(sessionId);

    // Return the compressed PDF with metadata
    return new NextResponse(compressedPdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="compressed.pdf"',
        "X-Original-Size": originalInfo.fileSize.toString(),
        "X-Compressed-Size": compressedInfo.fileSize.toString(),
        "X-Compression-Ratio": compressionRatio,
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
      },
    });
  } catch (error) {
    // Clean up on error
    if (sessionId) {
      await deleteSessionFolder(sessionId);
    }

    console.error("Compress PDF error:", error);

    // Check if error is related to Ghostscript
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    if (errorMessage.includes("Ghostscript")) {
      return NextResponse.json(
        {
          error:
            "Ghostscript is not installed on the server. Compression feature is unavailable.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Failed to compress PDF. Please try again." },
      { status: 500 },
    );
  }
}
