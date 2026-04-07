import Link from 'next/link';
import type { Metadata } from 'next';
import styles from '../policy.module.css';

export const metadata: Metadata = {
  title: 'Terms of Service — NextPDF',
  description: 'Terms and conditions for using NextPDF.',
};

export default function TermsOfService() {
  return (
    <div className={styles.page}>
      <nav className={styles.navbar}>
        <Link href="/" className={styles.logo}>
          <svg width="24" height="24" fill="none" stroke="#2563EB" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className={styles.logoText}>NextPDF</span>
        </Link>
        <span className={styles.divider}>/</span>
        <span className={styles.pageLabel}>Terms of Service</span>
      </nav>

      <main className={styles.main}>
        <article className={styles.content}>
          <span className={styles.tag}>Legal</span>
          <h1 className={styles.title}>Terms of Service</h1>
          <p className={styles.lastUpdated}>Last updated: April 2026 (rev. 3)</p>

          <div className={styles.infoBox}>
            <p>
              By using NextPDF, you agree to these terms. Please read them carefully.
              If you do not agree, please do not use the service.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>1. About NextPDF</h2>
            <p className={styles.text}>
              NextPDF is a free, browser-based PDF processing tool built with Next.js,
              TypeScript, pdf-lib, Ghostscript, and LibreOffice. It provides the following features:
            </p>
            <ul className={styles.list}>
              <li>
                <strong>Merge PDF</strong> — combine up to 10 PDF files into one, with
                drag-and-drop file ordering, up/down reordering controls, and optional
                per-file page selection (e.g., include only pages 1–3 from a specific file)
              </li>
              <li><strong>Compress PDF</strong> — reduce file size using Ghostscript with 4 quality levels</li>
              <li><strong>Split PDF</strong> — extract individual pages or custom page ranges</li>
              <li><strong>Edit PDF</strong> — visually delete, rotate, and reorder pages</li>
              <li><strong>Annotate PDF</strong> — add text annotations and drawings to PDF pages</li>
              <li>
                <strong>PDF → Word</strong> — export a PDF as an editable Word document (.docx)
                via LibreOffice; a quality estimate (0–100%) is provided after export to indicate
                expected conversion fidelity based on the document&apos;s image density
              </li>
              <li><strong>Word → PDF</strong> — convert .doc and .docx files to PDF via LibreOffice</li>
              <li><strong>Image → PDF</strong> — convert JPEG and PNG images to PDF (up to 20 images per operation)</li>
              <li><strong>PPT → PDF</strong> — convert .ppt and .pptx presentations to PDF via LibreOffice</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>2. Merge PDF — Ordering and Page Selection</h2>
            <p className={styles.text}>
              The Merge PDF feature allows you to control the exact order in which files are combined
              and to select specific pages from each file:
            </p>
            <ul className={styles.list}>
              <li>
                <strong>File ordering</strong> — drag files up or down in the list, or use the
                arrow buttons, to set the merge sequence. The order displayed in the interface
                is the order used in the final document.
              </li>
              <li>
                <strong>Page selection per file</strong> — optionally specify which pages to
                include from each PDF using the page range input. Leave it blank to include all
                pages. Accepted formats: <code>1-3</code> (range), <code>2,4,6</code> (list),
                or <code>1-3,5,7-9</code> (combined). Page numbers are 1-indexed.
              </li>
            </ul>
            <div className={styles.highlight}>
              <p>
                Both the file order and page ranges are transmitted in the same encrypted request
                as your files and are processed entirely server-side. They are never logged, stored,
                or associated with your identity.
              </p>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>3. PDF → Word Export and Quality Estimate</h2>
            <p className={styles.text}>
              The PDF → Word feature converts your PDF to a .docx file using LibreOffice&apos;s
              <code>writer_pdf_import</code> filter. Conversion quality depends on the source document:
            </p>
            <ul className={styles.list}>
              <li>
                <strong>Text-heavy PDFs</strong> (e.g., reports, contracts, articles) convert
                with high fidelity. Estimated quality: ~90%.
              </li>
              <li>
                <strong>Mixed PDFs</strong> (text and images) convert well for text sections.
                Estimated quality: ~70–80%.
              </li>
              <li>
                <strong>Image-heavy PDFs</strong> (charts, diagrams, photos on every page) may
                produce incomplete or unsatisfactory output. Estimated quality: ~40–50%.
              </li>
              <li>
                <strong>Scanned / image-only PDFs</strong> (no embedded text) will produce a
                .docx containing images rather than editable text. Estimated quality: ~20%.
              </li>
            </ul>
            <div className={styles.infoBox}>
              <p>
                <strong>About the quality percentage:</strong> After export, NextPDF displays an
                estimated quality score (0–100%). This is an automated estimate calculated from
                the average file size per page — a heuristic proxy for image density. It is not a
                guarantee of output accuracy. Always review the exported .docx before use.
              </p>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>4. Acceptable Use</h2>
            <p className={styles.text}>
              You agree to use NextPDF only for lawful purposes. You must not:
            </p>
            <ul className={styles.list}>
              <li>Upload files that contain malware, viruses, or malicious code</li>
              <li>Process files containing illegal content (e.g., copyrighted material without authorization, CSAM)</li>
              <li>Attempt to reverse engineer, exploit, or disrupt the service</li>
              <li>Use automated scripts to circumvent rate limits</li>
              <li>Resell or redistribute processed files claiming them as original work where not applicable</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>5. Service Limits</h2>
            <p className={styles.text}>
              To ensure fair usage and protect our infrastructure, the following limits apply:
            </p>
            <ul className={styles.list}>
              <li><strong>File size:</strong> Maximum 50 MB per file</li>
              <li><strong>File type (PDF tools):</strong> PDF files only (validated by magic number, not just extension)</li>
              <li><strong>File type (Convert tools):</strong> .doc/.docx for Word, JPEG/PNG for Image, .ppt/.pptx for PowerPoint</li>
              <li><strong>Merge:</strong> Maximum 10 PDF files per operation</li>
              <li><strong>Merge page ranges:</strong> Page numbers must be valid for the respective file; out-of-range values are silently clamped</li>
              <li><strong>Image → PDF:</strong> Maximum 20 images per operation</li>
              <li><strong>Rate limit:</strong> 10 requests per minute per IP address</li>
              <li><strong>Session TTL:</strong> Temporary files are automatically deleted within 30 minutes</li>
            </ul>
            <div className={styles.highlight}>
              <p>
                Exceeding rate limits will result in temporary blocking of your IP address.
                This is an automated protection measure, not a permanent ban.
              </p>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>6. Intellectual Property</h2>
            <p className={styles.text}>
              You retain full ownership of the files you upload. By using NextPDF, you grant us
              a temporary, limited license to process your files solely for the purpose of delivering
              the requested output. This license expires as soon as the session is deleted (within 30 minutes).
            </p>
            <p className={styles.text}>
              The NextPDF application, its source code, and design are the intellectual property of
              its author. You may not copy, redistribute, or use the codebase commercially without permission.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>7. Disclaimer of Warranties</h2>
            <p className={styles.text}>
              NextPDF is provided <strong>&quot;as is&quot;</strong> without any warranties, express or implied.
              We do not guarantee:
            </p>
            <ul className={styles.list}>
              <li>Uninterrupted or error-free operation of the service</li>
              <li>Perfect output quality for all PDF files (results may vary depending on input complexity)</li>
              <li>Accuracy of the PDF → Word conversion quality estimate</li>
              <li>Compatibility with all PDF versions or features</li>
              <li>Availability of the service at all times</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>8. Limitation of Liability</h2>
            <p className={styles.text}>
              To the maximum extent permitted by law, the creators of NextPDF shall not be liable
              for any indirect, incidental, special, or consequential damages arising from your use
              of the service, including but not limited to data loss, file corruption, or business interruption.
            </p>
            <p className={styles.text}>
              Always keep backups of your original files before processing.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>9. Changes to These Terms</h2>
            <p className={styles.text}>
              We reserve the right to modify these Terms of Service at any time. Changes will be
              reflected by the updated date at the top of this page. Continued use of NextPDF
              constitutes acceptance of any revised terms.
            </p>
          </div>

          <hr className={styles.separator} />

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Questions?</h2>
            <p className={styles.text}>
              For any questions regarding these Terms of Service, please contact us at{' '}
              <a href="mailto:admin@firmanasgani.id" className={styles.link}>admin@firmanasgani.id</a>.
            </p>
          </div>
        </article>
      </main>

      <footer className={styles.footer}>
        <nav className={styles.footerLinks}>
          <Link href="/privacy-policy" className={styles.footerLink}>Privacy Policy</Link>
          <span className={styles.footerDivider}>·</span>
          <Link href="/terms-of-service" className={styles.footerLink}>Terms of Service</Link>
          <span className={styles.footerDivider}>·</span>
          <Link href="/contact" className={styles.footerLink}>Contact Support</Link>
        </nav>
        <p className={styles.footerCredit}>
          Made with ❤️ by{' '}
          <a href="mailto:admin@firmanasgani.id">admin@firmanasgani.id</a>
          {' · '}
          <a href="https://firmanasgani.id" target="_blank" rel="noopener noreferrer">firmanasgani.id</a>
        </p>
      </footer>
    </div>
  );
}
