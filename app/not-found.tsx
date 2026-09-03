import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          letterSpacing: '0.2em',
          color: 'var(--text-mute)',
        }}
      >
        ERROR 404 · MODULE NOT FOUND
      </p>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
        This route isn&apos;t wired up
      </h1>
      <p style={{ color: 'var(--text-dim)', maxWidth: 420 }}>
        The page or module you requested doesn&apos;t exist. Head back to the workbench.
      </p>
      <Link
        href="/"
        style={{
          marginTop: '0.5rem',
          padding: '0.75rem 1.4rem',
          borderRadius: 10,
          fontWeight: 600,
          color: '#04121c',
          background: 'linear-gradient(120deg, var(--accent) 0%, #7dd3fc 100%)',
          border: '1px solid rgba(56, 189, 248, 0.6)',
          boxShadow: 'var(--glow-cyan)',
        }}
      >
        Back to home
      </Link>
    </div>
  );
}
