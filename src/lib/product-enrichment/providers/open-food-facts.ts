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
      
      const MAX_RETRIES = 3;
      let response: Response | null = null;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        try {
          response = await fetch(url, { headers: this.headers, signal: controller.signal });
          clearTimeout(timeoutId);

          if (response.ok || ![429, 502, 503, 504].includes(response.status)) break;

          const waitMs = Math.pow(2, attempt - 1) * 1500; // 1.5s, 3s, 6s
          console.warn(`OFF API returned ${response.status} for barcode ${barcode}, retry ${attempt}/${MAX_RETRIES} in ${waitMs}ms`);
          await new Promise(r => setTimeout(r, waitMs));
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          lastError = fetchErr as Error;
          if (attempt === MAX_RETRIES) throw lastError;
          const waitMs = Math.pow(2, attempt - 1) * 1500;
          console.warn(`OFF API fetch error for barcode ${barcode}, retry ${attempt}/${MAX_RETRIES} in ${waitMs}ms:`, fetchErr);
          await new Promise(r => setTimeout(r, waitMs));
        }
      }

      if (!response || !response.ok) {
        if (response?.status === 404) return null;
        throw new Error(`OpenFoodFacts API error: ${response?.status ?? 'no response'}`);
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

  private getDynamicCategoryStyle(slug: string): { emoji: string; color: string } {
    if (/carn|salum|prosciutt|mortadell|speck|wrustel|pollo|bovino|maiale/.test(slug)) return { emoji: '🥩', color: '#dc2626' };
    if (/pesc|tonn|salmon|merluzz|crostace|mollusc|gamber/.test(slug)) return { emoji: '🐟', color: '#0284c7' };
    if (/past|spaghett|maccheron|tortellin|raviol|gnocch|riso|cereali/.test(slug)) return { emoji: '🍝', color: '#ca8a04' };
    if (/pan|lievitat|focacc|grissin|cracker|piadin|panin|fette/.test(slug)) return { emoji: '🍞', color: '#d97706' };
    if (/verd|ortagg|insalat|pomodor|patat|legum|fagiol|lenticch|ceci/.test(slug)) return { emoji: '🥗', color: '#16a34a' };
    if (/frutt|mel|banan|agrum|succ|marmellat|confettur/.test(slug)) return { emoji: '🍎', color: '#ea580c' };
    if (/olio|condiment|sals|maiones|ket|senap|dad|spezie|brodo/.test(slug)) return { emoji: '🫒', color: '#65a30d' };
    if (/snack|patatin|popcorn|salat/.test(slug)) return { emoji: '🥨', color: '#b45309' };
    if (/bevand|acq|bibit|tè|caffè|infus|birr|vino/.test(slug)) return { emoji: '🥤', color: '#0891b2' };
    return { emoji: '🏷️', color: '#6366f1' };
  }

  public categorizeProduct(p: any): { id: string; label: string; emoji: string; color: string } {
    const tagsArr = Array.isArray(p.categories_tags) ? p.categories_tags : (Array.isArray(p.tags) ? p.tags : []);
    const tags = tagsArr.join(' ').toLowerCase();
    const name = [
      p.product_name_it,
      p.product_name,
      p.name_enc,
      p.name,
      p.description_enc
    ].filter(Boolean).join(' ').toLowerCase();

    // 1. Controlla prima i tag ufficiali di OFF
    if (tags.includes('plant-milks') || tags.includes('plant-based-beverages') || tags.includes('milk-substitutes')) {
      return { id: 'alternative-vegetali', label: 'Alternative Vegetali', emoji: '🥛', color: '#7c3aed' };
    }
    if (tags.includes('cheeses') || tags.includes('cream-cheeses') || tags.includes('plant-cheeses')) {
      return { id: 'formaggi', label: 'Formaggi & Spalmabili', emoji: '🧀', color: '#d97706' };
    }
    if (tags.includes('yogurts') || tags.includes('plant-yogurts') || tags.includes('fermented-milk')) {
      return { id: 'yogurt-dessert', label: 'Yogurt & Dessert', emoji: '🫙', color: '#16a34a' };
    }
    if (tags.includes('ice-creams') || tags.includes('sorbets')) {
      return { id: 'gelati', label: 'Gelati', emoji: '🍦', color: '#0891b2' };
    }
    if (tags.includes('biscuits') || tags.includes('cookies') || tags.includes('cakes') || tags.includes('pastries') || tags.includes('sweet-snacks')) {
      return { id: 'dolci-biscotti', label: 'Dolci & Biscotti', emoji: '🍪', color: '#be185d' };
    }
    if (tags.includes('meats') || tags.includes('cold-cuts') || tags.includes('hams') || tags.includes('sausages')) {
      return { id: 'salumi-carni', label: 'Salumi & Carni', emoji: '🥓', color: '#dc2626' };
    }
    if (tags.includes('breads') || tags.includes('flatbreads') || tags.includes('rusks') || tags.includes('crackers')) {
      return { id: 'pane-lievitati', label: 'Pane & Lievitati', emoji: '🍞', color: '#d97706' };
    }
    if (tags.includes('pastas') || tags.includes('cereals') || tags.includes('rice')) {
      return { id: 'pasta-cereali', label: 'Pasta & Cereali', emoji: '🍝', color: '#ca8a04' };
    }

    // 2. Controlla il nome e la descrizione del prodotto
    if (/gelato|ice cream|sorbetto|cremeria|magnum|cucciolone|stecco|tartufo|granita|cono|sandwich/i.test(name)) {
      return { id: 'gelati', label: 'Gelati', emoji: '🍦', color: '#0891b2' };
    }
    if (/yogurt|kefir|bifidus|budino|dessert|zymil|fermentato|pudding|mousse|merano|sojasun|activia|bella vita/i.test(name)) {
      return { id: 'yogurt-dessert', label: 'Yogurt & Dessert', emoji: '🫙', color: '#16a34a' };
    }
    if (/formaggio|cheese|mozzarella|burro|butter|ricotta|stracchino|crescenza|robiola|spalmabile|sottilette|grattugiato|mascarpone|provola|scamorza|gorgonzola|fiocchi di latte|fettine|fuso|violife|vemondo|philadelphia|stracciatella|burrata|tomino|edam|gouda|emmental|pecorino|grana|parmigiano/i.test(name)) {
      return { id: 'formaggi', label: 'Formaggi & Spalmabili', emoji: '🧀', color: '#d97706' };
    }
    if (/bevanda.*soia|bevanda.*riso|bevanda.*avena|bevanda.*mandorla|bevanda.*cocco|latte.*soia|latte.*riso|latte.*avena|latte.*mandorla|latte.*cocco|soya|soia drink|oat drink|almond drink|rice drink|panna vegetale|cuisine|alpro|valsoia|hipro|accadì|soyadrink|latte/i.test(name)) {
      return { id: 'alternative-vegetali', label: 'Alternative Vegetali', emoji: '🥛', color: '#7c3aed' };
    }
    if (/biscott|frollin|cookie|biscuit|wafer|cake|torta|crostata|muffin|madeleine|cornett|brioche|merenda|cioccolat|cacao|brownie|panettone|pandoro|fette biscottate|dolce/i.test(name)) {
      return { id: 'dolci-biscotti', label: 'Dolci & Biscotti', emoji: '🍪', color: '#be185d' };
    }
    if (/prosciutt|salum|mortadell|pancett|speck|wurstel|wrustel|carn|bresaol|pollo|tacchino|suino|manzo|vitello|salam|cotechino|guanciale|fesa|affettat|bacon/i.test(name)) {
      return { id: 'salumi-carni', label: 'Salumi & Carni', emoji: '🥓', color: '#dc2626' };
    }
    if (/pane|panino|panbauletto|panfette|grissin|cracker|piadin|focacc|lievitat|tarall|baguette|toast|rosetta|schiacciata/i.test(name)) {
      return { id: 'pane-lievitati', label: 'Pane & Lievitati', emoji: '🍞', color: '#d97706' };
    }
    if (/past|spaghett|penn|fusill|maccheron|gnocch|riso|farro|orzo|granola|muesli|cereali|fiocchi/i.test(name)) {
      return { id: 'pasta-cereali', label: 'Pasta & Cereali', emoji: '🍝', color: '#ca8a04' };
    }
    if (/burger|pizza|lasagna|ravioli|tortellini|zuppa|soup|cotoletta|nugget|piatto pronto|meal|risotto/i.test(name)) {
      return { id: 'piatti-pronti', label: 'Piatti Pronti', emoji: '🍳', color: '#b45309' };
    }
    if (/olio|aceto|sals|maiones|ket|senap|pesto|spezi|condiment|ajinomoto|dado|brodo/i.test(name)) {
      return { id: 'condimenti-salse', label: 'Condimenti & Salse', emoji: '🫒', color: '#65a30d' };
    }
    if (/acq|bibit|succ|thè|tè|infus|caffè|birr|vino|drink|bevanda|tisana/i.test(name)) {
      return { id: 'bevande', label: 'Bevande', emoji: '🥤', color: '#0891b2' };
    }

    // 3. Categorie dinamiche da OFF o da DB tags
    if (p.categories) {
      const parts = p.categories.split(',').map((s: string) => s.trim()).filter(Boolean);
      const genericWords = ['plant-based', 'alimenti', 'cibi', 'beverages', 'foods', 'prodotti', 'en:'];
      const candidate = parts.find((part: string) => part.length <= 30 && !genericWords.some(w => part.toLowerCase().includes(w))) || parts[0];
      
      if (candidate) {
        const id = candidate.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        if (id && id.length > 1) {
          const label = candidate.charAt(0).toUpperCase() + candidate.slice(1);
          const style = this.getDynamicCategoryStyle(id);
          return { id, label, emoji: style.emoji, color: style.color };
        }
      }
    }

    // 4. Se ha tag su DB (es. 'en:salty-snacks')
    const offTag = tagsArr.find((t: any) => typeof t === 'string' && t.startsWith('en:') && !t.includes('lactose'));
    if (offTag) {
      const clean = offTag.replace('en:', '').trim();
      if (clean && clean.length > 2) {
        const id = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const label = clean.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        const style = this.getDynamicCategoryStyle(id);
        return { id, label, emoji: style.emoji, color: style.color };
      }
    }

    return { id: 'personalizzato', label: 'Personalizzato', emoji: '⭐', color: '#f59e0b' };
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
        'categories',
        'categories_tags',
        'quantity'
      ].join(',');
      url.searchParams.append('fields', fields);

      // Retry con backoff esponenziale per errori temporanei (503, 429, 502)
      const MAX_RETRIES = 3;
      let response: Response | null = null;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
          response = await fetch(url.toString(), { headers: this.headers, signal: controller.signal });
          clearTimeout(timeoutId);

          // Successo o errore non recuperabile → esci dal loop
          if (response.ok || ![429, 502, 503, 504].includes(response.status)) break;

          // Errore recuperabile → attendi e riprova
          const waitMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          console.warn(`OFF API returned ${response.status}, retry ${attempt}/${MAX_RETRIES} in ${waitMs}ms`);
          await new Promise(r => setTimeout(r, waitMs));
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          lastError = fetchErr as Error;
          if (attempt === MAX_RETRIES) throw lastError;
          const waitMs = Math.pow(2, attempt - 1) * 1000;
          console.warn(`OFF API fetch error, retry ${attempt}/${MAX_RETRIES} in ${waitMs}ms:`, fetchErr);
          await new Promise(r => setTimeout(r, waitMs));
        }
      }

      if (!response || !response.ok) {
        throw new Error(`OpenFoodFacts Search API error: ${response?.status ?? 'no response'}`);
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
        const catInfo = this.categorizeProduct(p);

        return {
          id: p.code,
          name: name,
          description: description,
          category: catInfo.id,
          categoryLabel: catInfo.label,
          categoryColor: catInfo.color,
          emoji: catInfo.emoji,
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
