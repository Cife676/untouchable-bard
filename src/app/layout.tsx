import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Untouchable Bard | Cinematic TTRPG Audio Engine',
  description: 'Cinematic audio control system for D&D and Daggerheart tabletop RPG sessions.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0b0d11] text-[#e1e4ea] min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
