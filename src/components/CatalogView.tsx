'use client';

import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import ProductCard from './ProductCard';
import { useTranslations } from 'next-intl';

export default function CatalogView() {
  const t = useTranslations('Catalog');
  const tCat = useTranslations('Categories');
  const {
    products,
    allProducts,
    categories,
    searchQuery,
    selectedCategory,
    isLoading,
    error,
    setSearchQuery,
    setSelectedCategory,
    page,
    pageSize,
    totalCount,
    setPage,
  } = useApp();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state" role="alert">
        <span className="empty-icon">⚠️</span>
        <p className="empty-title">{t('errorTitle')}</p>
        <p className="empty-desc">{error}</p>
        <button className="empty-cta" onClick={() => window.location.reload()}>
          {t('retry')}
        </button>
      </div>
    );
  }

  const getCatName = (id: string, fallback: string) => {
    if (typeof tCat.has === 'function' && tCat.has(id)) {
      return tCat(id);
    }
    return fallback || id;
  };

  const activeCatObj = selectedCategory ? categories.find(c => c.id === selectedCategory) : null;
  const activeCatLabel = activeCatObj ? getCatName(activeCatObj.id, activeCatObj.label) : null;

  const totalPages = Math.ceil(totalCount / pageSize);

  const renderPaginationControls = (position: 'top' | 'bottom') => {
    if (totalPages <= 1) return null;

    return (
      <nav
        className={`catalog-pagination ${position}`}
        aria-label={`Paginazione ${position === 'top' ? 'superiore' : 'inferiore'}`}
      >
        <button
          type="button"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="pagination-btn"
          aria-label="Pagina precedente"
        >
          <span>&larr;</span>
          <span>Prec.</span>
        </button>

        <div className="pagination-badge" aria-current="page">
          <span>Pagina</span>
          <strong>{page}</strong>
          <span>di</span>
          <strong>{totalPages}</strong>
        </div>

        <button
          type="button"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="pagination-btn"
          aria-label="Pagina successiva"
        >
          <span>Succ.</span>
          <span>&rarr;</span>
        </button>
      </nav>
    );
  };

  return (
    <div>
      {/* Search & Toolbar Unificata Integrata (Proposta A) */}
      <section className="search-section" aria-label={t('filterLabel')}>
        <div className="search-toolbar">
          <div className="search-toolbar-left">
            <span className="search-icon">🔍</span>
            
            {/* Badge categoria attiva integrato nella barra di ricerca */}
            {activeCatObj && (
              <span className="active-cat-badge">
                <span>{activeCatObj.emoji}</span>
                <span>{activeCatLabel}</span>
                <button
                  type="button"
                  className="active-cat-remove"
                  onClick={() => setSelectedCategory(null)}
                  title="Rimuovi filtro categoria"
                >
                  ✕
                </button>
              </span>
            )}

            <input
              id="catalog-search"
              className="search-input"
              type="search"
              placeholder={activeCatObj ? `Cerca tra ${activeCatLabel}...` : t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={t('searchLabel')}
            />

            {searchQuery && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearchQuery('')}
                aria-label={t('clearSearch')}
              >
                ✕
              </button>
            )}
          </div>

          <div className="toolbar-separator" />

          {/* Selettore Categoria a Tendina Compatto */}
          <div className="cat-dropdown-container" ref={menuRef}>
            <button
              type="button"
              className={`cat-dropdown-btn ${selectedCategory ? 'has-filter' : ''}`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
              title="Filtra per categoria"
            >
              <span>{activeCatObj ? activeCatObj.emoji : '🏷️'}</span>
              <span className="dropdown-label-text">
                {activeCatObj ? activeCatLabel : t('filterAll')}
              </span>
              <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>▾</span>
            </button>

            {isMenuOpen && (
              <div className="cat-dropdown-menu" role="menu">
                <button
                  type="button"
                  className={`cat-dropdown-item ${!selectedCategory ? 'active' : ''}`}
                  onClick={() => { setSelectedCategory(null); setIsMenuOpen(false); }}
                >
                  <span>🌐 {t('filterAll')}</span>
                  <span className="cat-dropdown-count">{totalCount || allProducts.length}</span>
                </button>

                {categories.filter(c => Number(c.count) > 0).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`cat-dropdown-item ${selectedCategory === cat.id ? 'active' : ''}`}
                    onClick={() => { setSelectedCategory(cat.id); setIsMenuOpen(false); }}
                  >
                    <span>{cat.emoji} {getCatName(cat.id, cat.label)}</span>
                    <span className="cat-dropdown-count">{cat.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Results header */}
      <div className="section-header">
        <div className="section-header-title">
          <h1 className="section-title">
            {selectedCategory && activeCatLabel ? activeCatLabel : t('title')}
          </h1>
          <span className="section-count">
            {products.length} / {totalCount || allProducts.length} {t('title')}
          </span>
        </div>
        {products.length > 0 && renderPaginationControls('top')}
      </div>

      {/* Grid */}
      {products.length > 0 ? (
        <>
          <div className="products-grid" role="list" aria-label={t('title')}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {/* Pagination Controls */}
          {renderPaginationControls('bottom')}
        </>
      ) : (
        <div className="empty-state" role="status">
          <span className="empty-icon">🔎</span>
          <p className="empty-title">{t('noResultsTitle')}</p>
          <p className="empty-desc">{t('noResultsDesc')}</p>
          <button
            className="empty-cta"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory(null);
            }}
          >
            {t('resetFilters')}
          </button>
        </div>
      )}
    </div>
  );
}
