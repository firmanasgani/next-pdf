import Link from 'next/link';
import type { Metadata } from 'next';
import { toolConfig, toolGroups } from '@/lib/tools';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'NextPDF — Electronic PDF & Image Workbench',
  description:
    'Merge, compress, split, annotate and convert PDF & image files in your browser. Zero storage, processed in real-time.',
};

const stats = [
  { value: '11', label: 'Modules' },
  { value: '0', label: 'Files stored' },
  { value: '50MB', label: 'Max upload' },
  { value: '30min', label: 'Auto-wipe TTL' },
];

const features = [
  {
    title: 'Zero storage',
    body: 'Every file is processed in an isolated UUID session and shredded within 30 minutes. Nothing is logged.',
  },
  {
    title: 'Deep-linked modules',
    body: 'Each tool lives at its own URL. Refresh, bookmark or share a link — you land straight back in the same module.',
  },
  {
    title: 'Local processing',
    body: 'pdf-lib, Ghostscript and LibreOffice run on our own server. Your documents never touch a third-party API.',
  },
];

export default function Landing() {
  return (
    <div className={styles.page}>
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className={styles.nav}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </span>
          <span className={styles.brandText}>NextPDF</span>
        </div>
        <Link href="/tools/merge" className={styles.navCta}>
          Launch app
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <header className={styles.hero}>
        <p className={styles.kicker}>
          <span className={styles.pulse} />
          SYSTEM ONLINE · NO DATA RETAINED
        </p>
        <h1 className={styles.title}>
          The electronic <span className={styles.titleAccent}>PDF&nbsp;&amp;&nbsp;image</span> workbench
        </h1>
        <p className={styles.subtitle}>
          Eleven precision modules for merging, compressing, splitting, annotating and converting
          documents — routed, deep-linkable, and wiped clean the moment you&apos;re done.
        </p>
        <div className={styles.heroActions}>
          <Link href="/tools/merge" className={styles.primaryBtn}>
            Open the workbench
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <Link href="#modules" className={styles.ghostBtn}>
            Browse modules
          </Link>
        </div>

        <div className={styles.stats}>
          {stats.map((s) => (
            <div key={s.label} className={styles.stat}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ── Modules ─────────────────────────────────────────── */}
      <section id="modules" className={styles.modules}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Module registry</h2>
          <p className={styles.sectionSub}>Select a module to boot it in the workbench.</p>
        </div>

        {toolGroups.map((group) => (
          <div key={group.label} className={styles.group}>
            <p className={styles.groupLabel}>
              <span className={styles.groupTick} />
              {group.label}
            </p>
            <div className={styles.grid}>
              {group.tools.map((tool) => {
                const cfg = toolConfig[tool];
                return (
                  <Link key={tool} href={`/tools/${tool}`} className={styles.card}>
                    <span className={styles.cardIcon}>{cfg.icon}</span>
                    <span className={styles.cardBody}>
                      <span className={styles.cardTitle}>{cfg.label}</span>
                      <span className={styles.cardDesc}>{cfg.description}</span>
                    </span>
                    <span className={styles.cardSlug}>/tools/{tool}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section className={styles.features}>
        {features.map((f) => (
          <div key={f.title} className={styles.feature}>
            <h3 className={styles.featureTitle}>{f.title}</h3>
            <p className={styles.featureBody}>{f.body}</p>
          </div>
        ))}
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Ready when you are.</h2>
        <p className={styles.ctaSub}>No account, no upload queue, no trace left behind.</p>
        <Link href="/tools/merge" className={styles.primaryBtn}>
          Launch NextPDF
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
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
          <a href="mailto:admin@firmanasgani.id" className={styles.footerCreditLink}>admin@firmanasgani.id</a>
          {' · '}
          <a href="https://firmanasgani.id" target="_blank" rel="noopener noreferrer" className={styles.footerCreditLink}>firmanasgani.id</a>
        </p>
      </footer>
    </div>
  );
}
