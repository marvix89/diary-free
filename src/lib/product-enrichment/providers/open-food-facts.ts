import { IProductEnrichmentProvider, ProductEnrichmentData, PaginatedResult } from '../types';
import type { Product, Category } from '../../../types';

export class OpenFoodFactsProvider implements IProductEnrichmentProvider {
  private readonly baseUrl = 'https://world.openfoodfacts.org/api/v2';
  
  // Richiesto dalle guidelines OFF per uso responsabile
  private readonly headers = {
    'User-Agent': 'diary-free-app/1.0 - Web Application - https://github.com/marvix89/diary-free'
  };

  async fetchByBarcode(barcode: string): Promise<ProductEnrichmentData | null> {
    try {
      const fields = [
        'product_name',
        'brands',
        'image_url',
        'image_front_small_url',
        'nutriscore_grade',
        'nova_group',
        'ecoscore_grade',
        'allergens_tags',
        'ingredients_text',
        'nutriments',
        'nutriments_estimated',
        'labels_tags',
        'quantity'
      ].join(',');

      const url = `${this.baseUrl}/product/${barcode}.json?fields=${fields}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, { headers: this.headers, signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`OpenFoodFacts API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== 1 || !data.product) {
        return null;
      }

      const p = data.product;

      const enrichmentData: ProductEnrichmentData = {
        brand: p.brands,
        quantity: p.quantity,
        imageUrl: p.image_url,
        imageThumbnailUrl: p.image_front_small_url,
        ingredientsText: p.ingredients_text,
        allergens: p.allergens_tags,
        labels: p.labels_tags,
        
        // Scores
        nutriScore: p.nutriscore_grade?.toLowerCase() as ProductEnrichmentData['nutriScore'],
        novaGroup: p.nova_group as ProductEnrichmentData['novaGroup'],
        ecoScore: p.ecoscore_grade?.toLowerCase() as ProductEnrichmentData['ecoScore'],
        
        // Nutriments
        lactoseEstimated100g: p.nutriments_estimated?.lactose_100g,
      };

      // Map standard nutriments if available
      if (p.nutriments) {
        enrichmentData.nutriments = {
          kcal100g: p.nutriments['energy-kcal_100g'],
          proteins100g: p.nutriments.proteins_100g,
          fat100g: p.nutriments.fat_100g,
          carbs100g: p.nutriments.carbohydrates_100g,
          sugars100g: p.nutriments.sugars_100g,
        };
      }

      // Rimuovi campi undefined per pulizia
      Object.keys(enrichmentData).forEach(key => {
        if (enrichmentData[key as keyof ProductEnrichmentData] === undefined) {
          delete enrichmentData[key as keyof ProductEnrichmentData];
        }
      });

      return enrichmentData;
      
    } catch (error) {
      console.error(`Error fetching from OpenFoodFacts for barcode ${barcode}:`, error);
      return null;
    }
  }

  async searchProducts(query: string, locale: string, page: number = 1, pageSize: number = 25): Promise<PaginatedResult<Product>> {
    try {
      const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
      if (query) {
        url.searchParams.append('search_terms', query);
      }
      url.searchParams.append('search_simple', '1');
      url.searchParams.append('action', 'process');
      url.searchParams.append('json', '1');
      url.searchParams.append('page', page.toString());
      url.searchParams.append('page_size', pageSize.toString());
      url.searchParams.append('lc', locale);
      
      // Filtra solo prodotti senza lattosio (usiamo il label positivo per evitare timeout dell'API)
      url.searchParams.append('tagtype_0', 'labels');
      url.searchParams.append('tag_contains_0', 'contains');
      url.searchParams.append('tag_0', 'en:no-lactose');
      
      // Filtra solo prodotti disponibili in Italia
      url.searchParams.append('tagtype_1', 'countries');
      url.searchParams.append('tag_contains_1', 'contains');
      url.searchParams.append('tag_1', 'en:italy');
      
      const fields = [
        'code',
        'product_name',
        'product_name_it',
        'brands',
        'image_url',
        'image_front_small_url',
        'nutriscore_grade',
        'nova_group',
        'ecoscore_grade',
        'allergens_tags',
        'ingredients_text',
        'ingredients_text_it',
        'labels_tags',
        'quantity'
      ].join(',');
      url.searchParams.append('fields', fields);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url.toString(), { headers: this.headers, signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`OpenFoodFacts Search API error: ${response.status}`);
      }

      const data = await response.json();
      const count = data.count || 0;
      const returnedProducts = data.products || [];

      const mappedProducts: Product[] = returnedProducts.map((p: any) => {
        // Determinare lactose free basandosi su label o allergeni (approssimativo)
        const isVegan = p.labels_tags?.includes('en:vegan');
        const hasMilk = p.allergens_tags?.includes('en:milk');
        const isLactoseFree = isVegan || p.labels_tags?.includes('en:no-lactose') || p.labels_tags?.includes('en:lactose-free');

        // Usa i campi localizzati se disponibili, altrimenti fallback ai generici
        const name = p.product_name_it || p.product_name || p.brands || 'Prodotto Sconosciuto';
        const description = p.ingredients_text_it || p.ingredients_text || '';

        return {
          id: p.code,
          name: name,
          description: description,
          category: 'personalizzato' as Category, // OFF doesn't map 1:1 to our categories, default to 'personalizzato'
          emoji: '🛒',
          tags: p.labels_tags || [],
          isLactoseFree: isLactoseFree,
          lactoseLevel: isLactoseFree ? 'none' : (hasMilk ? 'low' : 'trace'),
          enrichment: {
            brand: p.brands,
            quantity: p.quantity,
            imageUrl: p.image_url,
            imageThumbnailUrl: p.image_front_small_url,
            ingredientsText: description,
            allergens: p.allergens_tags,
            labels: p.labels_tags,
            nutriScore: p.nutriscore_grade?.toLowerCase() as ProductEnrichmentData['nutriScore'],
            novaGroup: p.nova_group as ProductEnrichmentData['novaGroup'],
            ecoScore: p.ecoscore_grade?.toLowerCase() as ProductEnrichmentData['ecoScore'],
          }
        };
      });

      return {
        products: mappedProducts,
        count: count,
        page: parseInt(data.page) || page,
        pageCount: Math.ceil(count / pageSize),
        pageSize: parseInt(data.page_size) || pageSize
      };
      
    } catch (error) {
      console.error(`Error searching OpenFoodFacts for query "${query}":`, error);
      throw error;
    }
  }
}
