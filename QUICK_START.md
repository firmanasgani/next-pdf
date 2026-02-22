# 🚀 Quick Start Guide - NextPDF

## Instalasi Cepat

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Ghostscript (Optional - untuk fitur compress)

**Windows:**

```bash
choco install ghostscript
```

**Linux:**

```bash
sudo apt-get install ghostscript
```

**macOS:**

```bash
brew install ghostscript
```

### 3. Jalankan Development Server

```bash
npm run dev
```

Buka browser: **http://localhost:3000**

---

## 📖 Cara Menggunakan

### 🔗 Merge PDF

1. Pilih tool "Merge"
2. Upload 2-10 file PDF
3. Klik "Process PDF"
4. File merged akan ter-download

### 🗜️ Compress PDF

1. Pilih tool "Compress"
2. Upload 1 file PDF
3. Pilih quality (screen/ebook/printer/prepress)
4. Klik "Process PDF"
5. File compressed akan ter-download

### ✂️ Split PDF

1. Pilih tool "Split"
2. Upload 1 file PDF
3. Pilih mode:
   - **All Pages**: Split semua halaman (ZIP)
   - **Custom Ranges**: Split berdasarkan range (contoh: 1-3, 5-7)
4. Klik "Process PDF"
5. File akan ter-download

### ✏️ Edit PDF (Visual Editor)

1. Pilih tool "Edit PDF"
2. Upload 1 file PDF
3. Klik "✏️ Open Editor"
4. Di editor, Anda bisa:
   - **Delete**: Klik icon 🗑️ pada halaman
   - **Rotate**: Klik icon 🔄 untuk rotate 90°
   - **Reorder**: Drag & drop halaman ke posisi baru
5. Klik "Save Changes"
6. File modified akan ter-download

---

## 🐳 Docker Quick Start

### Build & Run

```bash
docker-compose up -d
```

Buka browser: **http://localhost:3000**

### Stop

```bash
docker-compose down
```

---

## 🔧 Troubleshooting

### Port 3000 sudah digunakan?

Server akan otomatis menggunakan port lain (3001, 3002, dst)

### Ghostscript not found?

Fitur compress tidak akan berfungsi. Install Ghostscript terlebih dahulu.

### File terlalu besar?

Default limit: 50MB. Edit `next.config.ts` untuk mengubah:

```typescript
experimental: {
  serverActions: {
    bodySizeLimit: '100mb', // Ubah sesuai kebutuhan
  },
},
```

### Rate limit exceeded?

Tunggu 1 menit atau edit `lib/rate-limiter.ts`:

```typescript
const MAX_REQUESTS = 20; // Ubah dari 10 ke 20
```

---

## 📚 Dokumentasi Lengkap

- **README.md**: Dokumentasi lengkap
- **PROJECT_SUMMARY.md**: Summary fitur & arsitektur
- **docs/PDF_EDITOR_GUIDE.md**: Panduan PDF Editor

---

## 🎯 Tips

- ✅ Gunakan **Edit PDF** untuk operasi kompleks (delete + rotate + reorder)
- ✅ **Compress** dulu sebelum merge untuk menghemat ukuran
- ✅ **Split** dengan custom ranges untuk ekstrak halaman tertentu
- ✅ Semua file temporary akan **otomatis terhapus** setelah 30 menit

---

**Happy PDF Processing! 🎉**
