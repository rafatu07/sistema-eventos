import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { getBaseUrl } from '@/lib/url-detector';
import { Providers } from '@/components/Providers';
import { SkipLink } from '@/components/SkipLink';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    template: '%s | Sistema de Gestão de Eventos',
    default: 'Sistema de Gestão de Eventos - Plataforma Completa para Eventos'
  },
  description: 'Plataforma completa para gestão de eventos com check-in digital, geração automática de certificados, dashboard administrativo e muito mais. Simplifique o gerenciamento dos seus eventos.',
  keywords: [
    'gestão de eventos',
    'sistema de eventos', 
    'check-in digital',
    'certificados automáticos',
    'dashboard eventos',
    'controle presença',
    'QR code eventos',
    'inscrições online'
  ],
  authors: [{ name: 'Sistema de Gestão de Eventos' }],
  creator: 'Sistema de Gestão de Eventos',
  publisher: 'Sistema de Gestão de Eventos',
  metadataBase: new URL(getBaseUrl()),
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: '/',
    siteName: 'Sistema de Gestão de Eventos',
    title: 'Sistema de Gestão de Eventos - Plataforma Completa',
    description: 'Plataforma completa para gestão de eventos com check-in digital, geração automática de certificados e dashboard administrativo.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Sistema de Gestão de Eventos',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sistema de Gestão de Eventos',
    description: 'Plataforma completa para gestão de eventos com check-in digital e certificados automáticos.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'technology',
  other: {
    'format-detection': 'telephone=no',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <SkipLink />
        <Providers>
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}

