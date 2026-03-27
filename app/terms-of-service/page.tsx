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
          <p className={styles.lastUpdated}>Last updated: March 2026 (rev. 2)</p>

          <div className={styles.infoBox}>
            <p>
              By using NextPDF, you agree to these terms. Please read them carefully.
              If you do not agree, please do not use the service.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>1. About NextPDF</h2>
            <p className={styles.text}>
              NextPDF is a free, browser-based PDF processing tool built with Next.js 15,
              TypeScript, pdf-lib, and Ghostscript. It provides the following features:
            </p>
            <ul className={styles.list}>
              <li><strong>Merge PDF</strong> — combine up to 10 PDF files into one</li>
              <li><strong>Compress PDF</strong> — reduce file size using Ghostscript with 4 quality levels</li>
              <li><strong>Split PDF</strong> — extract individual pages or custom page ranges</li>
              <li><strong>Edit PDF</strong> — visually delete, rotate, and reorder pages</li>
              <li><strong>Annotate PDF</strong> — add text annotations and drawings to PDF pages</li>
              <li><strong>Word → PDF</strong> — convert .doc and .docx files to PDF via LibreOffice</li>
              <li><strong>Image → PDF</strong> — convert JPEG and PNG images to PDF (up to 20 images per operation)</li>
              <li><strong>PPT → PDF</strong> — convert .ppt and .pptx presentations to PDF via LibreOffice</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>2. Acceptable Use</h2>
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
            <h2 className={styles.sectionTitle}>3. Service Limits</h2>
            <p className={styles.text}>
              To ensure fair usage and protect our infrastructure, the following limits apply:
            </p>
            <ul className={styles.list}>
              <li><strong>File size:</strong> Maximum 50 MB per file</li>
              <li><strong>File type (PDF tools):</strong> PDF files only (validated by magic number, not just extension)</li>
              <li><strong>File type (Convert tools):</strong> .doc/.docx for Word, JPEG/PNG for Image, .ppt/.pptx for PowerPoint</li>
              <li><strong>Merge:</strong> Maximum 10 PDF files per operation</li>
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
            <h2 className={styles.sectionTitle}>4. Intellectual Property</h2>
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
            <h2 className={styles.sectionTitle}>5. Disclaimer of Warranties</h2>
            <p className={styles.text}>
              NextPDF is provided <strong>"as is"</strong> without any warranties, express or implied.
              We do not guarantee:
            </p>
            <ul className={styles.list}>
              <li>Uninterrupted or error-free operation of the service</li>
              <li>Perfect output quality for all PDF files (results may vary depending on input complexity)</li>
              <li>Compatibility with all PDF versions or features</li>
              <li>Availability of the service at all times</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>6. Limitation of Liability</h2>
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
            <h2 className={styles.sectionTitle}>7. Changes to These Terms</h2>
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
