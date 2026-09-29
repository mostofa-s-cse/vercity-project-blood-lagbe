import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

const TITLE = 'Blood Lagbe? (রক্ত লাগবে?) - Emergency Lifeline Network';
const DESCRIPTION =
  'Emergency Medical Lifeline Portal & Centralized Blood Rescue Network for Bangladesh. Real-time geo-matched donor broadcast, live telemetry tracker, and DGHS operations command.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'website' },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
