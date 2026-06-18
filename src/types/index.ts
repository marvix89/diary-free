export type Category =
  | 'latticini-alternativi'
  | 'frutta-verdura'
  | 'cereali-legumi'
  | 'carne-pesce'
  | 'bevande'
  | 'snack-dolci'
  | 'condimenti'
  | 'personalizzato';

export interface Product {
  id: string;
  name: string;
  category: Category;
  description: string;
  emoji: string;
  tags: string[];
  isCustom?: boolean;
  isLactoseFree: boolean;
  lactoseLevel?: 'none' | 'trace' | 'low';
}

export interface CustomProduct extends Product {
  isCustom: true;
  addedAt: string;
}

export type View = 'catalog' | 'favorites' | 'add';
