import Link from 'next/link';
import type { Metadata } from 'next';
import styles from '../policy.module.css';

export const metadata: Metadata = {
  title: 'Contact Support — NextPDF',
  description: 'Get in touch with the NextPDF team.',
};

export default function Contact() {
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
        <span className={styles.pageLabel}>Contact Support</span>
      </nav>

      <main className={styles.main}>
        <article className={styles.content}>
          <span className={styles.tag}>Support</span>
          <h1 className={styles.title}>Contact & Support</h1>
          <p className={styles.lastUpdated}>We usually respond within 1–2 business days</p>

          <div className={styles.highlight}>
            <p>
              NextPDF is a free tool built and maintained by a solo developer.
              All feedback, bug reports, and questions are genuinely appreciated!
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Get in Touch</h2>

            <a href="mailto:admin@firmanasgani.id" className={styles.contactCard}>
              <div className={styles.contactIcon}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className={styles.contactLabel}>Email</p>
                <p className={styles.contactValue}>admin@firmanasgani.id</p>
              </div>
              <div className={styles.contactArrow}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>

            <a href="https://firmanasgani.id" target="_blank" rel="noopener noreferrer" className={styles.contactCard}>
              <div className={styles.contactIcon}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <div>
                <p className={styles.contactLabel}>Website</p>
                <p className={styles.contactValue}>firmanasgani.id</p>
              </div>
              <div className={styles.contactArrow}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>

            <a href="https://saweria.co/firmanasgani" target="_blank" rel="noopener noreferrer" className={styles.contactCard}>
              <div className={styles.contactIcon}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <p className={styles.contactLabel}>Support the Developer</p>
                <p className={styles.contactValue}>saweria.co/firmanasgani</p>
              </div>
              <div className={styles.contactArrow}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Before You Write</h2>
            <p className={styles.text}>
              Please check these common questions first — they may answer your question instantly:
            </p>
            <ul className={styles.list}>
              <li>
                <strong>Are my files stored?</strong> No. Files are automatically deleted within 30 minutes.
                See our <Link href="/privacy-policy" className={styles.link}>Privacy Policy</Link>.
              </li>
              <li>
                <strong>What is the file size limit?</strong> 50 MB per file. For merge, up to 10 files at once.
              </li>
              <li>
                <strong>Why did compression fail?</strong> Make sure Ghostscript is installed on the server.
                If you are self-hosting, refer to the README for setup instructions.
              </li>
              <li>
                <strong>Can I use NextPDF on mobile?</strong> Yes — the interface is responsive and works on modern mobile browsers.
              </li>
              <li>
                <strong>Is NextPDF open source?</strong> The codebase is built with Next.js 15, TypeScript,
                pdf-lib, and Ghostscript. Contact us if you are interested in contributing.
              </li>
            </ul>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Feature Requests & Bug Reports</h2>
            <p className={styles.text}>
              Found a bug or have an idea to improve NextPDF? Send an email to{' '}
              <a href="mailto:admin@firmanasgani.id" className={styles.link}>admin@firmanasgani.id</a> with:
            </p>
            <ul className={styles.list}>
              <li>A clear description of the issue or feature</li>
              <li>Steps to reproduce (for bugs)</li>
              <li>Your browser and operating system</li>
              <li>A sample file if relevant (only if it does not contain sensitive information)</li>
            </ul>
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
