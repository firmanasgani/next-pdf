import { NextRequest, NextResponse } from "next/server";
import {
  createSessionFolder,
  saveUploadedFile,
  deleteSessionFolder,
} from "@/lib/temp-manager";
import { validatePDFFile } from "@/lib/file-validator";
import { splitPDF, SplitRange } from "@/lib/pdf-processor";
import { checkRateLimit, getClientIP } from "@/lib/rate-limiter";
import archiver from "archiver";
import { Readable } from "stream";

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
    const mode = (formData.get("mode") as string) || "all"; // 'all' or 'range'
    const rangesJson = formData.get("ranges") as string;

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

    let ranges: SplitRange[] | undefined;

    // Parse ranges if mode is 'range'
    if (mode === "range" && rangesJson) {
      try {
        ranges = JSON.parse(rangesJson);

        // Validate ranges
        if (!Array.isArray(ranges) || ranges.length === 0) {
          return NextResponse.json(
            { error: "Invalid ranges format. Must be a non-empty array." },
            { status: 400 },
          );
        }

        for (const range of ranges) {
          if (!range.start || !range.end || range.start > range.end) {
            return NextResponse.json(
              {
                error:
                  "Invalid range. Start must be less than or equal to end.",
              },
              { status: 400 },
            );
          }
        }
      } catch (error) {
        return NextResponse.json(
          { error: "Invalid ranges JSON format." },
          { status: 400 },
        );
      }
    }

    // Split PDF
    const outputPaths = await splitPDF(inputPath, session.path, ranges);

    // If only one file, return it directly
    if (outputPaths.length === 1) {
      const { default: fs } = await import("fs/promises");
      const pdfBuffer = await fs.readFile(outputPaths[0]);

      await deleteSessionFolder(sessionId);

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="split.pdf"',
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        },
      });
    }

    // Multiple files - create a ZIP archive
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    // Add files to archive
    for (const outputPath of outputPaths) {
      const { default: fs } = await import("fs");
      const fileName = outputPath.split(/[\\/]/).pop() || "output.pdf";
      archive.append(fs.createReadStream(outputPath), { name: fileName });
    }

    // Finalize the archive
    archive.finalize();

    // Convert archive stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of archive as unknown as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }
    const zipBuffer = Buffer.concat(chunks);

    // Clean up session folder
    await deleteSessionFolder(sessionId);

    // Return the ZIP file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="split_pdfs.zip"',
        "X-File-Count": outputPaths.length.toString(),
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
      },
    });
  } catch (error) {
    // Clean up on error
    if (sessionId) {
      await deleteSessionFolder(sessionId);
    }

    console.error("Split PDF error:", error);
    return NextResponse.json(
      { error: "Failed to split PDF. Please try again." },
      { status: 500 },
    );
  }
}
