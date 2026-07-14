import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Case Tracker',
  description: 'Portal bantuan dan knowledge base support.',
  icons: {
    icon: '/img/favicon.png',
    shortcut: '/img/favicon.png',
    apple: '/img/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
