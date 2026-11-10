import { DM_Sans, JetBrains_Mono, Syne } from 'next/font/google';

export const syne = Syne({ subsets: ['latin'], variable: '--font-syne' });

export const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });

export const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});
