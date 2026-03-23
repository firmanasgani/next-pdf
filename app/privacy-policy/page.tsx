import Link from 'next/link';
import type { Metadata } from 'next';
import styles from '../policy.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy — NextPDF',
  description: 'How NextPDF handles your files and protects your privacy.',
};

export default function PrivacyPolicy() {
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
        <span className={styles.pageLabel}>Privacy Policy</span>
      </nav>

      <main className={styles.main}>
        <article className={styles.content}>
          <span className={styles.tag}>Legal</span>
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.lastUpdated}>Last updated: March 2026</p>

          <div className={styles.highlight}>
            <p>
              <strong>Short version:</strong> Your files are processed in real-time and never stored on our servers.
              We do not collect personal information, create accounts, or track your usage across sessions.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>1. Information We Do Not Collect</h2>
            <p className={styles.text}>
              NextPDF is built with a zero-storage philosophy. We do not collect, store, or share:
            </p>
            <ul className={styles.list}>
              <li>Your name, email address, or any personal identifiers</li>
              <li>Account credentials (there are no accounts)</li>
              <li>Payment or billing information</li>
              <li>Browsing history or cross-site tracking data</li>
              <li>The content of your PDF files</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>2. How Your Files Are Handled</h2>
            <p className={styles.text}>
              When you upload a PDF file, it is processed entirely server-side using an isolated,
              UUID-based session. Here is what happens step by step:
            </p>
            <ul className={styles.list}>
              <li>Your file is temporarily held in a session folder (identified by a random UUID, not tied to your identity)</li>
              <li>The file is processed (merged, compressed, split, or modified) using <strong>pdf-lib</strong> or <strong>Ghostscript</strong></li>
              <li>The resulting file is sent directly back to your browser as a download</li>
              <li>The session folder and all its contents are automatically deleted within <strong>30 minutes</strong> of creation</li>
            </ul>
            <div className={styles.infoBox}>
              <p>
                File validation is performed using magic number checks (not just file extension),
                ensuring only valid PDF files are processed. Files are limited to <strong>50 MB</strong> each.
              </p>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>3. Security Measures</h2>
            <p className={styles.text}>
              NextPDF implements several layers of security to protect your files and our infrastructure:
            </p>
            <ul className={styles.list}>
              <li><strong>Magic number validation</strong> — files are validated by content, not just extension</li>
              <li><strong>Path traversal protection</strong> — filenames are sanitized before being used server-side</li>
              <li><strong>Session isolation</strong> — each upload session is completely isolated from others</li>
              <li><strong>Rate limiting</strong> — requests are limited to 10 per minute per IP address to prevent abuse</li>
              <li><strong>Auto cleanup</strong> — all session files are automatically deleted (TTL: 30 minutes)</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>4. Cookies & Local Storage</h2>
            <p className={styles.text}>
              NextPDF uses minimal browser storage only for UI state (e.g., dismissing the support banner).
              No tracking cookies, advertising cookies, or analytics pixels are used.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>5. Third-Party Services</h2>
            <p className={styles.text}>
              NextPDF does not embed third-party trackers, analytics scripts, or advertising networks.
              The application is self-hosted and processes all files locally on our server — your files
              are never sent to external APIs or cloud storage providers.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>6. Changes to This Policy</h2>
            <p className={styles.text}>
              We may update this Privacy Policy from time to time. The "last updated" date at the top
              of this page will reflect any changes. Continued use of NextPDF after changes constitutes
              acceptance of the updated policy.
            </p>
          </div>

          <hr className={styles.separator} />

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Questions?</h2>
            <p className={styles.text}>
              If you have any questions about this Privacy Policy, please contact us at{' '}
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
