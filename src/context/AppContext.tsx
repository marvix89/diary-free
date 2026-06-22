'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';
import type { Product } from '@/types';

interface AppContextType {
  products: Product[];
  allProducts: Product[];
  favoriteIds: string[];
  customProducts: Product[];
  searchQuery: string;
  selectedCategory: string | null;
  isLoading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  totalCount: number;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
  toggleFavorite: (id: string) => Promise<void>;
  addCustomProduct: (product: Omit<Product, 'id' | 'isCustom'>) => Promise<void>;
  setSearchQuery: (q: string) => void;
  setSelectedCategory: (cat: string | null) => void;
  isFavorite: (id: string) => boolean;
  favoriteProducts: Product[];
  removeCustomProduct: (id: string) => Promise<void>;
  isDark: boolean;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  // Inizializza tema dal localStorage
  useEffect(() => {
    const saved = localStorage.getItem('df-theme');
    const dark = saved === 'dark';
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('df-theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  // Carica prodotti dinamicamente in base a ricerca e paginazione
  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const url = new URL('/api/products', window.location.origin);
        if (searchQuery) url.searchParams.set('q', searchQuery);
        url.searchParams.set('page', page.toString());
        url.searchParams.set('limit', pageSize.toString());

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Errore nel caricamento dati.');
        
        const data = await res.json();
        setAllProducts(data.products || []);
        setTotalCount(data.count || 0);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Debounce the search query
    const timeoutId = setTimeout(() => {
      loadProducts();
    }, 800);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery, page, pageSize]);

  // Carica i preferiti solo una volta all'avvio
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const res = await fetch('/api/favorites');
        if (res.ok) {
          const favs = await res.json();
          setFavoriteIds(favs);
        }
      } catch (err) {
        console.error('Errore caricamento preferiti', err);
      }
    };
    loadFavorites();
  }, []);

  // Prodotti filtrati per categoria (ricerca è server side)
  const products = selectedCategory 
    ? allProducts.filter((p) => p.category === selectedCategory)
    : allProducts;

  const customProducts = allProducts.filter((p) => p.isCustom);
  const favoriteProducts = allProducts.filter((p) => favoriteIds.includes(p.id));
  const isFavorite = (id: string) => favoriteIds.includes(id);

  // Toggle preferito con optimistic update
  const toggleFavorite = useCallback(
    async (id: string) => {
      const wasFav = favoriteIds.includes(id);
      setFavoriteIds((prev) =>
        wasFav ? prev.filter((f) => f !== id) : [...prev, id]
      );
      try {
        const method = wasFav ? 'DELETE' : 'POST';
        const res = await fetch(`/api/favorites/${id}`, { method });
        if (!res.ok) throw new Error();
      } catch {
        // Rollback in caso di errore
        setFavoriteIds((prev) =>
          wasFav ? [...prev, id] : prev.filter((f) => f !== id)
        );
      }
    },
    [favoriteIds]
  );

  // Aggiunta prodotto custom
  const addCustomProduct = useCallback(
    async (product: Omit<Product, 'id' | 'isCustom'>) => {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Errore durante il salvataggio');
      }

      const newProduct: Product = await res.json();
      setAllProducts((prev) => [...prev, newProduct]);
    },
    []
  );

  // Rimozione prodotto custom con optimistic update
  const removeCustomProduct = useCallback(
    async (id: string) => {
      const snapshot = allProducts;
      setAllProducts((p) => p.filter((pr) => pr.id !== id));
      setFavoriteIds((f) => f.filter((fid) => fid !== id));

      try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
      } catch {
        // Rollback
        setAllProducts(snapshot);
      }
    },
    [allProducts]
  );

  return (
    <AppContext.Provider
      value={{
        products,
        allProducts,
        favoriteIds,
        customProducts,
        searchQuery,
        selectedCategory,
        isLoading,
        error,
        toggleFavorite,
        addCustomProduct,
        setSearchQuery,
        setSelectedCategory,
        isFavorite,
        favoriteProducts,
        removeCustomProduct,
        isDark,
        toggleTheme,
        page,
        pageSize,
        totalCount,
        setPage,
        setPageSize,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve essere usato dentro AppProvider');
  return ctx;
}
