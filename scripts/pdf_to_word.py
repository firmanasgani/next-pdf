"""
PDF to Word conversion using pdf2docx.
Usage: python pdf_to_word.py <input_pdf_path> <output_docx_path>
"""
import sys
import os

def convert(pdf_path: str, docx_path: str) -> None:
    from pdf2docx import Converter
    cv = Converter(pdf_path)
    cv.convert(docx_path, start=0, end=None)
    cv.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python pdf_to_word.py <input_pdf> <output_docx>", file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]
    docx_path = sys.argv[2]

    if not os.path.isfile(pdf_path):
        print(f"Input file not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    try:
        convert(pdf_path, docx_path)
        print("success")
    except Exception as e:
        print(f"Conversion error: {e}", file=sys.stderr)
        sys.exit(1)
