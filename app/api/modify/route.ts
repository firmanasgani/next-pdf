import { NextRequest, NextResponse } from "next/server";
import {
  createSessionFolder,
  saveUploadedFile,
  deleteSessionFolder,
} from "@/lib/temp-manager";
import { validatePDFFile } from "@/lib/file-validator";
import { modifyPDF } from "@/lib/pdf-processor";
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
    const operationsJson = formData.get("operations") as string;

    if (!operationsJson) {
      return NextResponse.json(
        { error: "Operations parameter is required" },
        { status: 400 },
      );
    }

    // Validate file
    const validation = await validatePDFFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Parse operations
    let operations: {
      pagesToDelete?: number[];
      rotations?: { page: number; rotation: 90 | 180 | 270 }[];
      reorder?: number[];
    };

    try {
      operations = JSON.parse(operationsJson);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid operations JSON format." },
        { status: 400 },
      );
    }

    // Validate rotations if provided
    if (operations.rotations) {
      for (const rotation of operations.rotations) {
        if (![90, 180, 270].includes(rotation.rotation)) {
          return NextResponse.json(
            { error: "Rotation must be 90, 180, or 270 degrees" },
            { status: 400 },
          );
        }
      }
    }

    // Create session folder
    const session = await createSessionFolder();
    sessionId = session.sessionId;

    // Save uploaded file
    const inputPath = await saveUploadedFile(sessionId, file, "input.pdf");
    const outputPath = path.join(session.path, "modified.pdf");

    // Perform all operations in one go
    await modifyPDF(inputPath, outputPath, operations);

    // Read the output PDF
    const outputPdfBuffer = await fs.readFile(outputPath);

    // Clean up session folder
    await deleteSessionFolder(sessionId);

    // Return the modified PDF
    return new NextResponse(outputPdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="modified.pdf"',
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
      },
    });
  } catch (error) {
    // Clean up on error
    if (sessionId) {
      await deleteSessionFolder(sessionId);
    }

    console.error("Modify PDF error:", error);
    return NextResponse.json(
      { error: "Failed to modify PDF. Please try again." },
      { status: 500 },
    );
  }
}
