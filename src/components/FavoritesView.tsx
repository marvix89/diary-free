'use client';

import { useApp } from '@/context/AppContext';
import Link from 'next/link';
import ProductCard from './ProductCard';

export default function FavoritesView() {
  const { favoriteProducts, customProducts, isLoading } = useApp();

  const categoriesCount = [
    ...new Set(favoriteProducts.map((p) => p.category)),
  ].length;

  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <p>Caricamento preferiti…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">I Miei Preferiti</h1>
        <span className="section-count">{favoriteProducts.length} prodotti</span>
      </div>

      {favoriteProducts.length > 0 ? (
        <>
          <div className="stats-bar" aria-label="Statistiche preferiti">
            <div className="stat-card">
              <div className="stat-value">{favoriteProducts.length}</div>
              <div className="stat-label">Preferiti</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{categoriesCount}</div>
              <div className="stat-label">Categorie</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{customProducts.length}</div>
              <div className="stat-label">Personali</div>
            </div>
          </div>

          <div className="products-grid" role="list" aria-label="Prodotti preferiti">
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
          <p className="empty-title">Nessun preferito ancora</p>
          <p className="empty-desc">
            Sfoglia il catalogo e premi ❤️ sui prodotti che vuoi salvare.
          </p>
          <Link href="/" className="empty-cta">
            Vai al Catalogo
          </Link>
        </div>
      )}
    </div>
  );
}
