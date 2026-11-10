import type { Metadata } from 'next';
import { ToastProvider } from '@/components/toast';
import { dmSans, jetBrainsMono, syne } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Stewards — Split Ledger', template: '%s · Stewards' },
  description: 'Split expenses with friends. One honest number, kept on the record.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable} ${jetBrainsMono.variable} h-dvh antialiased`}
    >
      <body className="flex h-dvh flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
