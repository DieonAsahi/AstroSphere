import type { Metadata } from 'next';
import '../styles/global.css';

export const metadata: Metadata = {
  title: 'AstroSphere - Edu Planet 3D',
  description: 'Platform Edukasi Tata Surya 3D Real-Time untuk Siswa, Guru, dan Admin di Indonesia',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-cyan-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

