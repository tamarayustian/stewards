import { Fraunces, IBM_Plex_Mono, Karla } from 'next/font/google';

export const karla = Karla({ variable: '--font-karla', subsets: ['latin'] });

export const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'] });

export const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});
