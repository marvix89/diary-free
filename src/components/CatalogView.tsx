'use client';

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

  return (
    <div>
      {/* Search & Filters */}
      <section className="search-section" aria-label={t('filterLabel')}>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            id="catalog-search"
            className="search-input"
            type="search"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t('searchLabel')}
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => setSearchQuery('')}
              aria-label={t('clearSearch')}
            >
              ✕
            </button>
          )}
        </div>

        <div
          className="category-filters"
          role="tablist"
          aria-label={t('filterLabel')}
        >
          <button
            id="filter-all"
            role="tab"
            className={`cat-chip ${!selectedCategory ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
            aria-selected={!selectedCategory}
          >
            {t('filterAll')}
          </button>
          {categories.filter(c => Number(c.count) > 0).map((cat) => (
            <button
              key={cat.id}
              id={`filter-${cat.id}`}
              role="tab"
              className={`cat-chip ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === cat.id ? null : cat.id
                )
              }
              aria-selected={selectedCategory === cat.id}
            >
              {cat.emoji} {getCatName(cat.id, cat.label)}
            </button>
          ))}
        </div>
      </section>

      {/* Results header */}
      <div className="section-header">
        <h1 className="section-title">
          {selectedCategory
            ? (() => {
                const c = categories.find(cat => cat.id === selectedCategory);
                return c ? getCatName(c.id, c.label) : selectedCategory;
              })()
            : t('title')}
        </h1>
        <span className="section-count">
          {products.length} / {totalCount} {t('title')}
        </span>
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
          {totalCount > pageSize && (
            <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
              <button 
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: 'var(--surface)', color: 'var(--text-primary)' }}
              >
                &larr; Prec.
              </button>
              <span style={{ alignSelf: 'center', color: 'var(--text-secondary)' }}>Pagina {page} di {Math.ceil(totalCount / pageSize)}</span>
              <button 
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(totalCount / pageSize)}
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: 'var(--surface)', color: 'var(--text-primary)' }}
              >
                Succ. &rarr;
              </button>
            </div>
          )}
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
