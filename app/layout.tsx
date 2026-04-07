import type { Metadata } from 'next';
import './globals.css';
import '@/lib/cleanup-service';

export const metadata: Metadata = {
  title: 'NextPDF - Professional PDF Processing Tool',
  description: 'Merge, compress, split, and modify PDF files with ease. No data stored permanently.',
  keywords: ['PDF', 'merge', 'compress', 'split', 'PDF tools', 'document processing'],
  icons: {
    icon: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
