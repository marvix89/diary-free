import { IProductEnrichmentProvider, ProductEnrichmentData } from '../types';

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
      
      const response = await fetch(url, { headers: this.headers });
      
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
}
