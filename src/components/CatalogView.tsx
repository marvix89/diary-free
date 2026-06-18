import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../data/products';
import ProductCard from './ProductCard';

export default function CatalogView() {
  const {
    products,
    allProducts,
    searchQuery,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
  } = useApp();

  return (
    <div>
      {/* Search & Filters */}
      <section className="search-section" aria-label="Ricerca e filtri">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            id="catalog-search"
            className="search-input"
            type="search"
            placeholder="Cerca prodotti, ingredienti, tag…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Cerca prodotti"
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Cancella ricerca"
            >
              ✕
            </button>
          )}
        </div>

        <div className="category-filters" role="tablist" aria-label="Filtra per categoria">
          <button
            id="filter-all"
            role="tab"
            className={`cat-chip ${!selectedCategory ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
            aria-selected={!selectedCategory}
          >
            🌟 Tutti
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              id={`filter-${cat.id}`}
              role="tab"
              className={`cat-chip ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() =>
                setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
              }
              aria-selected={selectedCategory === cat.id}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Results header */}
      <div className="section-header">
        <h1 className="section-title">
          {selectedCategory
            ? CATEGORIES.find(c => c.id === selectedCategory)?.label ?? 'Prodotti'
            : 'Catalogo Prodotti'}
        </h1>
        <span className="section-count">
          {products.length} di {allProducts.length}
        </span>
      </div>

      {/* Grid */}
      {products.length > 0 ? (
        <div className="products-grid" role="list" aria-label="Lista prodotti">
          {products.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="empty-state" role="status">
          <span className="empty-icon">🔎</span>
          <p className="empty-title">Nessun prodotto trovato</p>
          <p className="empty-desc">
            Prova a cambiare la ricerca o i filtri. Se il prodotto non esiste, puoi aggiungerlo tu!
          </p>
          <button
            className="empty-cta"
            onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
          >
            Reimposta filtri
          </button>
        </div>
      )}
    </div>
  );
}
