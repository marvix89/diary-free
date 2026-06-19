import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dairy Free – Guida per Intolleranti al Lattosio',
  description:
    'Dairy Free – La guida per intolleranti al lattosio: catalogo prodotti sicuri, lista preferiti e prodotti personalizzati.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SessionProvider>
          {children}
          <footer className="global-footer">
            <div className="footer-links">
              <a href="/privacy">Privacy Policy</a>
              <a href="/cookie">Cookie Policy</a>
              <a href="/terms">Termini e Condizioni</a>
            </div>
            <div className="footer-copyright">
              &copy; {new Date().getFullYear()} Dairy Free. Tutti i diritti riservati.
            </div>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
