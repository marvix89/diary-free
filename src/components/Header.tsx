'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useApp } from '@/context/AppContext';
import { useState, useRef, useEffect } from 'react';

export default function Header() {
  const { data: session } = useSession();
  const { favoriteProducts, isDark, toggleTheme } = useApp();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

          {session?.user && (
            <div className="user-menu" ref={dropdownRef}>
              <button
                className="user-avatar"
                title={session.user.email ?? ''}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{ cursor: 'pointer', border: 'none', padding: 0 }}
              >
                {(session.user.email ?? 'U')[0].toUpperCase()}
              </button>
              
              {isDropdownOpen && (
                <div className="user-dropdown">
                  <button onClick={() => { toggleTheme(); setIsDropdownOpen(false); }}>
                    <span>{isDark ? '☀️' : '🌙'}</span> Tema {isDark ? 'chiaro' : 'scuro'}
                  </button>
                  <Link href="/profile" onClick={() => setIsDropdownOpen(false)}>
                    <span>⚙️</span> Gestione account
                  </Link>
                  <button
                    className="logout-item"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                  >
                    <span>👋</span> Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
