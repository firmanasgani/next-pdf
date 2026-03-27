import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const pdfDoc = await PDFDocument.create();

    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const mimeType = file.type;

      let image;
      if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
        image = await pdfDoc.embedJpg(bytes);
      } else if (mimeType === 'image/png') {
        image = await pdfDoc.embedPng(bytes);
      } else {
        return NextResponse.json(
          { error: `Unsupported image type: ${mimeType}. Only JPEG and PNG are supported.` },
          { status: 400 }
        );
      }

      const { width, height } = image;
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(image, { x: 0, y: 0, width, height });
    }

    const pdfBytes = Buffer.from(await pdfDoc.save());

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="converted.pdf"',
      },
    });
  } catch (error) {
    console.error('Image to PDF error:', error);
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 });
  }
}
