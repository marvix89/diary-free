import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Product } from '../types';
import { PRODUCTS } from '../data/products';

interface AppContextType {
  products: Product[];
  favorites: Set<string>;
  customProducts: Product[];
  searchQuery: string;
  selectedCategory: string | null;
  toggleFavorite: (id: string) => void;
  addCustomProduct: (product: Omit<Product, 'id' | 'isCustom'>) => void;
  setSearchQuery: (q: string) => void;
  setSelectedCategory: (cat: string | null) => void;
  isFavorite: (id: string) => boolean;
  favoriteProducts: Product[];
  allProducts: Product[];
  removeCustomProduct: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('df-favorites');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [customProducts, setCustomProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('df-custom-products');
    return saved ? JSON.parse(saved) : [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('df-favorites', JSON.stringify([...favorites]));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('df-custom-products', JSON.stringify(customProducts));
  }, [customProducts]);

  const allProducts = [...PRODUCTS, ...customProducts];

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const addCustomProduct = (product: Omit<Product, 'id' | 'isCustom'>) => {
    const newProduct: Product = {
      ...product,
      id: `custom-${Date.now()}`,
      isCustom: true,
    };
    setCustomProducts(prev => [...prev, newProduct]);
  };

  const removeCustomProduct = (id: string) => {
    setCustomProducts(prev => prev.filter(p => p.id !== id));
    setFavorites(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const isFavorite = (id: string) => favorites.has(id);

  const favoriteProducts = allProducts.filter(p => favorites.has(p.id));

  const products = allProducts.filter(p => {
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <AppContext.Provider
      value={{
        products,
        favorites,
        customProducts,
        searchQuery,
        selectedCategory,
        toggleFavorite,
        addCustomProduct,
        setSearchQuery,
        setSelectedCategory,
        isFavorite,
        favoriteProducts,
        allProducts,
        removeCustomProduct,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
