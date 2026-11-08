import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AstroSphere 3D Player — Edu Planet 3D',
  description:
    'Eksplorasi tata surya 3D real-time di browser untuk siswa dan guru di Indonesia.',
};

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-slate-950 text-slate-100">{children}</div>;
}

