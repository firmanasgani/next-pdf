import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, mkdir, rm } from 'fs/promises';
import { join, basename, extname } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  const sessionDir = join(tmpdir(), `nextpdf-word-${uuidv4()}`);

  try {
    await mkdir(sessionDir, { recursive: true });

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = extname(file.name).toLowerCase();
    if (!['.doc', '.docx'].includes(ext)) {
      return NextResponse.json(
        { error: 'Only .doc and .docx files are supported' },
        { status: 400 }
      );
    }

    const inputPath = join(sessionDir, file.name);
    await writeFile(inputPath, new Uint8Array(await file.arrayBuffer()));

    await execAsync(
      `soffice --headless --convert-to pdf --outdir "${sessionDir}" "${inputPath}"`
    );

    const outputName = basename(file.name, ext) + '.pdf';
    const outputPath = join(sessionDir, outputName);
    const pdfBytes = await readFile(outputPath);

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outputName}"`,
      },
    });
  } catch (error) {
    console.error('Word to PDF error:', error);
    return NextResponse.json(
      { error: 'Conversion failed. Make sure LibreOffice is installed on the server.' },
      { status: 500 }
    );
  } finally {
    try {
      await rm(sessionDir, { recursive: true, force: true });
    } catch {}
  }
}
