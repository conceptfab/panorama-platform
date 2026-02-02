import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'latin-ext'],
});

const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';

export const metadata: Metadata = {
  title: `Pano Viewer v: ${appVersion} - CONCEPTFAB`,
  description: 'Platforma do przeglądania panoram 360°',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
