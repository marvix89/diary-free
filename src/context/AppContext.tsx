import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Product } from '../types';
import { PRODUCTS } from '../data/products';

interface AppContextType {
  products: Product[];
  favoriteIds: string[];
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
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('df-favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const [customProducts, setCustomProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('df-custom-products');
    return saved ? JSON.parse(saved) : [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('df-favorites', JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  useEffect(() => {
    localStorage.setItem('df-custom-products', JSON.stringify(customProducts));
  }, [customProducts]);

  const allProducts = [...PRODUCTS, ...customProducts];

  const toggleFavorite = (id: string) => {
    setFavoriteIds(prev =>
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
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
    setFavoriteIds(prev => prev.filter(fid => fid !== id));
  };

  const isFavorite = (id: string) => favoriteIds.includes(id);

  const favoriteProducts = allProducts.filter(p => favoriteIds.includes(p.id));

  const products = allProducts.filter(p => {
    const isMatchSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const isMatchCategory = !selectedCategory || p.category === selectedCategory;
    return isMatchSearch && isMatchCategory;
  });

  return (
    <AppContext.Provider
      value={{
        products,
        favoriteIds,
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
