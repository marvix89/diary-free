'use client';

import { useState } from 'react';
import type { Product } from '@/types';
import { useApp } from '@/context/AppContext';
import { CATEGORIES } from '@/data/products';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import ProductDialog from './ProductDialog';

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const categoryInfo = CATEGORIES.find((c) => c.id === product.category);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(product.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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
    <article
      className="product-card"
      id={`product-${product.id}`}
      onClick={() => setIsDialogOpen(true)}
      style={{ cursor: 'pointer' }}
    >
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

      <div className="product-title-group">
        <h3 className="product-name">{product.name}</h3>
        {product.enrichment?.brand && (
          <p className="product-brand">{product.enrichment.brand}</p>
        )}
      </div>

      <div className="product-body">
        {product.enrichment?.imageThumbnailUrl && (
          <div className="product-image-container">
            <Image
              src={product.enrichment.imageThumbnailUrl}
              alt={product.name}
              width={90}
              height={90}
              className="product-thumbnail-large"
              unoptimized
            />
          </div>
        )}
        <div className="product-text">
          <p className="product-description">
            {product.description?.length > 130
              ? `${product.description.slice(0, 130)}...`
              : product.description}
          </p>
        </div>
      </div>

      <div className="product-footer">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={`lactose-badge ${product.lactoseLevel ?? 'none'}`}>
            {lactoseLabel()}
          </span>
          {product.enrichment?.nutriScore && (
            <span className={`nutriscore-badge score-${product.enrichment.nutriScore}`}>
              Nutri-Score {product.enrichment.nutriScore.toUpperCase()}
            </span>
          )}
        </div>
        
        {product.isCustom && (
          <span className="custom-badge">{t('customBadge')}</span>
        )}
      </div>

      {isDialogOpen && (
        <ProductDialog product={product} onClose={() => setIsDialogOpen(false)} />
      )}
    </article>
  );
}
