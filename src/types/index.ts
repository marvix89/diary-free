export type Category =
  | 'alternative-vegetali'
  | 'formaggi'
  | 'yogurt-dessert'
  | 'dolci-biscotti'
  | 'gelati'
  | 'piatti-pronti'
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
