import type { Metadata } from 'next';
import { ToastProvider } from '@/components/toast';
import { fraunces, ibmPlexMono, karla } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stewards',
  description: 'Split expenses. Steward faithfully.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${karla.variable} ${fraunces.variable} ${ibmPlexMono.variable} h-dvh antialiased`}
    >
      <body className="flex h-dvh flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
