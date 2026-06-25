'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { signOut, useSession } from 'next-auth/react';
import { useApp } from '@/context/AppContext';
import { useState, useRef, useEffect } from 'react';

export default function Header() {
  const t = useTranslations('Header');
  const locale = useLocale();
  const pathname = usePathname();

  const { data: session } = useSession();
  const { favoriteProducts, isDark, toggleTheme } = useApp();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path);

  const changeLanguage = (newLocale: string) => {
    window.location.href = `/${newLocale}${pathname === '/' ? '' : pathname}`;
    setIsDropdownOpen(false);
  };

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
          <span className="header-badge">✓ {t('badge')}</span>
        </div>

        <nav className="top-nav" aria-label="Navigazione principale">
          <Link
            href="/"
            id="nav-catalog"
            className={`nav-btn ${isActive('/') ? 'active' : ''}`}
          >
            <span className="nav-icon">🔍</span>
            <span className="nav-label">{t('catalog')}</span>
          </Link>

          <div className="nav-btn-wrap">
            <Link
              href="/favorites"
              id="nav-favorites"
              className={`nav-btn ${isActive('/favorites') ? 'active' : ''}`}
            >
              <span className="nav-icon">❤️</span>
              <span className="nav-label">{t('favorites')}</span>
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
            <span className="nav-label">{t('add')}</span>
          </Link>

          {/* Top-level language switcher with real flag images */}
          <div className="lang-switcher">
            <button
              className={`lang-btn ${locale === 'it' ? 'active' : ''}`}
              onClick={() => changeLanguage('it')}
              title="Italiano"
            >
              <span className="fi fi-it" />
            </button>
            <button
              className={`lang-btn ${locale === 'en' ? 'active' : ''}`}
              onClick={() => changeLanguage('en')}
              title="English"
            >
              <span className="fi fi-gb" />
            </button>
          </div>

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
                    <span>{isDark ? '☀️' : '🌙'}</span> {isDark ? t('themeLight') : t('themeDark')}
                  </button>
                  <Link href="/profile" onClick={() => setIsDropdownOpen(false)}>
                    <span>⚙️</span> {t('account')}
                  </Link>
                  {session.user.isAdmin && (
                    <Link href="/admin" onClick={() => setIsDropdownOpen(false)}>
                      <span>📥</span> {t('admin')}
                    </Link>
                  )}

                  {/* Dropdown language selector */}
                  <div className="dropdown-lang-row">
                    <span className="dropdown-lang-label">{t('langLabel')}:</span>
                    <button
                      className={`lang-btn ${locale === 'it' ? 'active' : ''}`}
                      onClick={() => changeLanguage('it')}
                      title="Italiano"
                    >
                      <span className="fi fi-it" />
                    </button>
                    <button
                      className={`lang-btn ${locale === 'en' ? 'active' : ''}`}
                      onClick={() => changeLanguage('en')}
                      title="English"
                    >
                      <span className="fi fi-gb" />
                    </button>
                  </div>

                  <button
                    className="logout-item"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                  >
                    <span>👋</span> {t('logout')}
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
