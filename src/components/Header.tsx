'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useApp } from '@/context/AppContext';

export default function Header() {
  const { data: session } = useSession();
  const { favoriteProducts, isDark, toggleTheme } = useApp();
  const pathname = usePathname();

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path);

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-logo">
          <div className="header-logo-icon">🥛</div>
          <span className="header-logo-text">Dairy Free</span>
          <span className="header-badge">✓ Senza Lattosio</span>
        </div>

        <nav className="top-nav" aria-label="Navigazione principale">
          <Link
            href="/"
            id="nav-catalog"
            className={`nav-btn ${isActive('/') ? 'active' : ''}`}
          >
            <span className="nav-icon">🔍</span>
            <span className="nav-label">Catalogo</span>
          </Link>

          <div className="nav-btn-wrap">
            <Link
              href="/favorites"
              id="nav-favorites"
              className={`nav-btn ${isActive('/favorites') ? 'active' : ''}`}
            >
              <span className="nav-icon">❤️</span>
              <span className="nav-label">Preferiti</span>
            </Link>
            {favoriteProducts.length > 0 && (
              <span className="nav-badge">{favoriteProducts.length}</span>
            )}
          </div>

          <Link
            href="/add"
            id="nav-add"
            className={`nav-btn ${isActive('/add') ? 'active' : ''}`}
          >
            <span className="nav-icon">➕</span>
            <span className="nav-label">Aggiungi</span>
          </Link>

          <button
            id="theme-toggle"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
            title={isDark ? 'Tema chiaro' : 'Tema scuro'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>

          {session?.user && (
            <div className="user-menu">
              <span className="user-avatar" title={session.user.email ?? ''}>
                {(session.user.email ?? 'U')[0].toUpperCase()}
              </span>
              <button
                id="logout-btn"
                className="logout-btn"
                onClick={() => signOut({ callbackUrl: '/login' })}
                title="Esci dall'account"
              >
                Esci
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
