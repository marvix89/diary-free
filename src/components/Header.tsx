import type { View } from '../types';
import { useApp } from '../context/AppContext';

interface HeaderProps {
  currentView: View;
  onViewChange: (v: View) => void;
}

export default function Header({ currentView, onViewChange }: HeaderProps) {
  const { favoriteProducts } = useApp();

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-logo">
          <div className="header-logo-icon">🥛</div>
          <span className="header-logo-text">Dairy Free</span>
          <span className="header-badge">✓ Senza Lattosio</span>
        </div>

        <nav className="top-nav" aria-label="Navigazione principale">
          <button
            id="nav-catalog"
            className={`nav-btn ${currentView === 'catalog' ? 'active' : ''}`}
            onClick={() => onViewChange('catalog')}
          >
            <span className="nav-icon">🔍</span>
            <span className="nav-label">Catalogo</span>
          </button>

          <div className="nav-btn-wrap">
            <button
              id="nav-favorites"
              className={`nav-btn ${currentView === 'favorites' ? 'active' : ''}`}
              onClick={() => onViewChange('favorites')}
            >
              <span className="nav-icon">❤️</span>
              <span className="nav-label">Preferiti</span>
            </button>
            {favoriteProducts.length > 0 && (
              <span className="nav-badge">{favoriteProducts.length}</span>
            )}
          </div>

          <button
            id="nav-add"
            className={`nav-btn ${currentView === 'add' ? 'active' : ''}`}
            onClick={() => onViewChange('add')}
          >
            <span className="nav-icon">➕</span>
            <span className="nav-label">Aggiungi</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
