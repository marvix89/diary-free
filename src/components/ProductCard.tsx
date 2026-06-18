import type { Product } from '../types';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../data/products';

interface ProductCardProps {
  product: Product;
  isShowDeleteButton?: boolean;
}

export default function ProductCard({ product, isShowDeleteButton = false }: ProductCardProps) {
  const { toggleFavorite, isFavorite, removeCustomProduct } = useApp();
  const isFav = isFavorite(product.id);

  const categoryInfo = CATEGORIES.find(c => c.id === product.category);

  const handleFavoriteClick = () => {
    toggleFavorite(product.id);
  };

  const handleDeleteClick = () => {
    if (confirm(`Rimuovere "${product.name}" dalla lista?`)) {
      removeCustomProduct(product.id);
    }
  };

  return (
    <article className="product-card" id={`product-${product.id}`}>
      <div className="product-card-header">
        <div
          className="product-emoji-wrap"
          style={{ background: categoryInfo ? `${categoryInfo.color}18` : undefined }}
        >
          {product.emoji}
        </div>
        <div className="product-card-actions">
          {isShowDeleteButton && product.isCustom && (
            <button
              className="delete-btn"
              onClick={handleDeleteClick}
              title="Rimuovi prodotto"
              aria-label={`Rimuovi ${product.name}`}
            >
              🗑️
            </button>
          )}
          <button
            id={`fav-btn-${product.id}`}
            className={`fav-btn ${isFav ? 'is-active' : ''}`}
            onClick={handleFavoriteClick}
            title={isFav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
            aria-label={isFav ? `Rimuovi ${product.name} dai preferiti` : `Aggiungi ${product.name} ai preferiti`}
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
        {product.tags.map(tag => (
          <span key={tag} className="product-tag">{tag}</span>
        ))}
      </div>

      <div className="product-footer">
        <span className={`lactose-badge ${product.lactoseLevel ?? 'none'}`}>
          {product.lactoseLevel === 'none' && '✓ 0% Lattosio'}
          {product.lactoseLevel === 'trace' && '⚠ Tracce'}
          {product.lactoseLevel === 'low' && '~ Basso'}
          {!product.lactoseLevel && '✓ 0% Lattosio'}
        </span>
        {product.isCustom && (
          <span className="custom-badge">⭐ Personale</span>
        )}
      </div>
    </article>
  );
}
