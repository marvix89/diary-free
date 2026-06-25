'use client';

import { useApp } from '@/context/AppContext';
import { Link } from '@/i18n/routing';
import ProductCard from './ProductCard';
import { useTranslations } from 'next-intl';

export default function FavoritesView() {
  const t = useTranslations('Favorites');
  const { favoriteProducts, isLoading } = useApp();

  const categoriesCount = [
    ...new Set(favoriteProducts.map((p) => p.category)),
  ].length;

  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <p>{t('loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <div className="section-header-title">
          <h1 className="section-title">{t('title')}</h1>
          <span className="section-count">{favoriteProducts.length} {t('statFavorites').toLowerCase()}</span>
        </div>
      </div>

      {favoriteProducts.length > 0 ? (
        <>
          <div className="stats-bar" aria-label={t('title')}>
            <div className="stat-card">
              <div className="stat-value">{favoriteProducts.length}</div>
              <div className="stat-label">{t('statFavorites')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{categoriesCount}</div>
              <div className="stat-label">{t('statCategories')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{favoriteProducts.filter((p) => p.isCustom).length}</div>
              <div className="stat-label">{t('statPersonal')}</div>
            </div>
          </div>

          <div className="products-grid" role="list" aria-label={t('title')}>
            {favoriteProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                isShowDeleteButton={p.isCustom}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state" role="status">
          <span className="empty-icon">💔</span>
          <p className="empty-title">{t('emptyTitle')}</p>
          <p className="empty-desc">{t('emptyDesc')}</p>
          <Link href="/" className="empty-cta">
            {t('goToCatalog')}
          </Link>
        </div>
      )}
    </div>
  );
}
