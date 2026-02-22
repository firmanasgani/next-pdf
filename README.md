# NextPDF - Professional PDF Processing Tool

NextPDF adalah aplikasi web untuk memproses file PDF dengan fitur merge, compress, split, rotate, dan delete pages. Dibangun dengan Next.js, TypeScript, dan pdf-lib.

## 🚀 Fitur

- **Merge PDF**: Gabungkan beberapa file PDF menjadi satu
- **Compress PDF**: Kompres PDF dengan berbagai level kualitas (menggunakan Ghostscript)
- **Split PDF**: Pisahkan PDF per halaman atau berdasarkan range tertentu
- **Edit PDF (Visual Editor)**:
  - ✏️ Preview semua halaman PDF
  - 🗑️ Delete halaman dengan klik
  - 🔄 Rotate halaman (90°, 180°, 270°)
  - 🔀 Reorder halaman dengan drag & drop
  - 💾 Simpan semua perubahan dalam satu file

📖 **[Panduan Lengkap PDF Editor](docs/PDF_EDITOR_GUIDE.md)**

## 🛠️ Teknologi

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **PDF Engine**: pdf-lib
- **Compression**: Ghostscript
- **Runtime**: Node.js (SSR, bukan Edge Runtime)
- **Deployment**: VPS / Docker ready

## 📋 Prasyarat

- Node.js 18+
- npm atau yarn
- Ghostscript (untuk fitur compress)

### Install Ghostscript

**Windows:**

```bash
# Download dari: https://ghostscript.com/releases/gsdnld.html
# Atau gunakan chocolatey:
choco install ghostscript
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt-get update
sudo apt-get install ghostscript
```

**macOS:**

```bash
brew install ghostscript
```

## 🔧 Instalasi

1. Clone repository:

```bash
git clone <repository-url>
cd nextpdf
```

2. Install dependencies:

```bash
npm install
```

3. Jalankan development server:

```bash
npm run dev
```

4. Buka browser: `http://localhost:3000`

## 🏗️ Struktur Project

```
nextpdf/
├── app/
│   ├── api/
│   │   ├── merge/route.ts       # API merge PDF
│   │   ├── compress/route.ts    # API compress PDF
│   │   ├── split/route.ts       # API split PDF
│   │   └── modify/route.ts      # API modify PDF (delete, rotate, reorder)
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Homepage
│   ├── page.module.css          # Homepage styles
│   └── globals.css              # Global styles
├── components/
│   ├── FileUpload.tsx           # Drag & drop upload component
│   ├── FileUpload.module.css    # Upload component styles
│   ├── PDFEditor.tsx            # Visual PDF editor component
│   └── PDFEditor.module.css     # PDF editor styles
├── lib/
│   ├── temp-manager.ts          # Session folder management
│   ├── file-validator.ts        # PDF validation & security
│   ├── rate-limiter.ts          # Rate limiting per IP
│   ├── pdf-processor.ts         # PDF processing utilities
│   └── cleanup-service.ts       # Auto cleanup expired files
├── docs/
│   └── PDF_EDITOR_GUIDE.md      # PDF Editor user guide
├── types/
│   └── react-pdf.d.ts           # TypeScript declarations for react-pdf
├── temp/                        # Temporary files (auto-created)
├── Dockerfile                   # Docker configuration
├── docker-compose.yml           # Docker Compose configuration
├── next.config.ts               # Next.js configuration
├── package.json
└── tsconfig.json
```

## 🔐 Keamanan

- **File Validation**: Validasi magic number PDF (bukan hanya extension)
- **File Size Limit**: Max 50MB per file
- **File Count Limit**: Max 10 files untuk merge
- **Path Traversal Protection**: Sanitasi filename dan path validation
- **Rate Limiting**: 10 requests per menit per IP
- **Auto Cleanup**: File temporary dihapus otomatis setelah 30 menit

## 📦 File Handling

- Setiap request mendapat folder session UUID-based
- File disimpan di `temp/{sessionId}/`
- File dihapus setelah response selesai
- Fallback cleanup service berjalan setiap 10 menit
- Tidak ada file yang disimpan permanen

## 🚀 Deployment

### Docker

1. Build image:

```bash
docker build -t nextpdf .
```

2. Run container:

```bash
docker run -p 3000:3000 nextpdf
```

### VPS (PM2)

1. Build production:

```bash
npm run build
```

2. Start dengan PM2:

```bash
pm2 start npm --name "nextpdf" -- start
```

### Environment Variables

Tidak ada environment variables yang diperlukan. Semua konfigurasi sudah ada di code.

## 📝 API Endpoints

### POST /api/merge

Merge multiple PDF files.

**Request:**

- Content-Type: `multipart/form-data`
- Body: `files` (multiple PDF files)

**Response:**

- Content-Type: `application/pdf`
- File: merged.pdf

### POST /api/compress

Compress a PDF file.

**Request:**

- Content-Type: `multipart/form-data`
- Body:
  - `file` (single PDF file)
  - `quality` (optional): `screen` | `ebook` | `printer` | `prepress`

**Response:**

- Content-Type: `application/pdf`
- Headers:
  - `X-Original-Size`: Original file size
  - `X-Compressed-Size`: Compressed file size
  - `X-Compression-Ratio`: Compression percentage

### POST /api/split

Split PDF into pages or ranges.

**Request:**

- Content-Type: `multipart/form-data`
- Body:
  - `file` (single PDF file)
  - `mode`: `all` | `range`
  - `ranges` (optional, JSON): `[{start: 1, end: 3}, ...]`

**Response:**

- Content-Type: `application/pdf` or `application/zip`
- File: Single PDF or ZIP archive

### POST /api/modify

Modify PDF (delete, rotate, and reorder pages).

**Request:**

- Content-Type: `multipart/form-data`
- Body:
  - `file` (single PDF file)
  - `operations` (JSON):
    ```json
    {
      "pagesToDelete": [2, 4], // Optional: pages to delete (1-indexed)
      "rotations": [
        // Optional: pages to rotate
        { "page": 1, "rotation": 90 },
        { "page": 3, "rotation": 180 }
      ],
      "reorder": [1, 3, 2, 4] // Optional: new page order (1-indexed)
    }
    ```

**Response:**

- Content-Type: `application/pdf`
- File: modified.pdf

## 🧪 Testing

Test API dengan curl:

```bash
# Merge
curl -X POST http://localhost:3000/api/merge \
  -F "files=@file1.pdf" \
  -F "files=@file2.pdf" \
  -o merged.pdf

# Compress
curl -X POST http://localhost:3000/api/compress \
  -F "file=@input.pdf" \
  -F "quality=ebook" \
  -o compressed.pdf

# Split (all pages)
curl -X POST http://localhost:3000/api/split \
  -F "file=@input.pdf" \
  -F "mode=all" \
  -o split.zip

# Split (range)
curl -X POST http://localhost:3000/api/split \
  -F "file=@input.pdf" \
  -F "mode=range" \
  -F 'ranges=[{"start":1,"end":3}]' \
  -o range.pdf
```

## 🐛 Troubleshooting

**Ghostscript not found:**

- Install Ghostscript sesuai OS Anda
- Pastikan `gs` command tersedia di PATH

**File too large:**

- Adjust `bodySizeLimit` di `next.config.ts`
- Default: 50MB

**Rate limit exceeded:**

- Tunggu 1 menit atau adjust rate limit di `lib/rate-limiter.ts`

## 📄 License

MIT

## 👨‍💻 Author

Built by Senior Fullstack Engineer
