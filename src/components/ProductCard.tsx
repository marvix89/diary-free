'use client';

import type { Product } from '@/types';
import { useApp } from '@/context/AppContext';
import { CATEGORIES } from '@/data/products';
import { useTranslations } from 'next-intl';

interface ProductCardProps {
  product: Product;
  isShowDeleteButton?: boolean;
}

export default function ProductCard({
  product,
  isShowDeleteButton = false,
}: ProductCardProps) {
  const t = useTranslations('ProductCard');
  const { toggleFavorite, isFavorite, removeCustomProduct } = useApp();
  const isFav = isFavorite(product.id);

  const categoryInfo = CATEGORIES.find((c) => c.id === product.category);

  const handleFavoriteClick = () => {
    toggleFavorite(product.id);
  };

  const handleDeleteClick = () => {
    if (confirm(t('removeConfirm', { name: product.name }))) {
      removeCustomProduct(product.id);
    }
  };

  const lactoseLabel = () => {
    switch (product.lactoseLevel) {
      case 'trace': return t('lactoseTrace');
      case 'low': return t('lactoseLow');
      default: return t('lactoseNone');
    }
  };

  return (
    <article className="product-card" id={`product-${product.id}`}>
      <div className="product-card-header">
        <div
          className="product-emoji-wrap"
          style={{
            background: categoryInfo
              ? `${categoryInfo.color}18`
              : undefined,
          }}
        >
          {product.emoji}
        </div>
        <div className="product-card-actions">
          {isShowDeleteButton && product.isCustom && (
            <button
              className="delete-btn"
              onClick={handleDeleteClick}
              title={t('removeProduct')}
              aria-label={`${t('removeProduct')}: ${product.name}`}
            >
              🗑️
            </button>
          )}
          <button
            id={`fav-btn-${product.id}`}
            className={`fav-btn ${isFav ? 'is-active' : ''}`}
            onClick={handleFavoriteClick}
            title={isFav ? t('removeFavorite') : t('addFavorite')}
            aria-label={
              isFav
                ? `${t('removeFavorite')}: ${product.name}`
                : `${t('addFavorite')}: ${product.name}`
            }
            aria-pressed={isFav}
          >
            {isFav ? '❤️' : '🤍'}
          </button>
        </div>
      </div>

      <div>
        <h3 className="product-name">{product.name}</h3>
        <p className="product-description">{product.description}</p>
      </div>

      <div className="product-tags">
        {product.tags.map((tag) => (
          <span key={tag} className="product-tag">
            {tag}
          </span>
        ))}
      </div>

      <div className="product-footer">
        <span className={`lactose-badge ${product.lactoseLevel ?? 'none'}`}>
          {lactoseLabel()}
        </span>
        {product.isCustom && (
          <span className="custom-badge">{t('customBadge')}</span>
        )}
      </div>
    </article>
  );
}
