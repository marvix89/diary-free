import { auth } from '@/lib/auth';
import { ensureSchema, getDb } from '@/lib/db';
import { OpenFoodFactsProvider } from '@/lib/product-enrichment/providers/open-food-facts';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Accesso negato: richiesti permessi di amministratore' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const q = body.q || '';
    const page = parseInt(body.page || '1', 10);
    const limit = parseInt(body.limit || '25', 10);
    const locale = 'it';

    const provider = new OpenFoodFactsProvider();
    const offResults = await provider.searchProducts(q, locale, page, limit);

    if (!offResults.products || offResults.products.length === 0) {
      return Response.json({ success: true, count: 0, products: [], pageCount: 0, totalCount: 0, currentPage: page });
    }

    await ensureSchema();
    const sql = getDb();

    // Le immagini vengono sincronizzate separatamente tramite /api/admin/sync-images
    // per non bloccare l'importazione dei dati prodotto in caso di errori Blob

    // Inserimento batch tramite postgres.js
    // Mappiamo i prodotti per l'insert
        const rowsToInsert = offResults.products.map(p => ({
      id: p.id,
      name_enc: p.name, // in chiaro per i pubblici
      description_enc: p.description, // in chiaro per i pubblici
      category: p.category,
      emoji: p.emoji,
      tags: p.tags,
      lactose_level: p.lactoseLevel,
      is_lactose_free: p.isLactoseFree,
      is_custom: false,
      user_id: null,
      
      // Enrichment
      image_url: p.enrichment?.imageUrl || null,
      image_thumbnail_url: p.enrichment?.imageThumbnailUrl || null,
      blob_pathname: (p as any)._blobPathname || null,
      nutriscore: p.enrichment?.nutriScore || null,
      nova_group: p.enrichment?.novaGroup || null,
      ecoscore: p.enrichment?.ecoScore || null,
      allergens: p.enrichment?.allergens || [],
      ingredients_text: p.enrichment?.ingredientsText || null,
      brand: p.enrichment?.brand || null,
      quantity: p.enrichment?.quantity || null,
    }));

    // Cancellazione vecchi seed statici (i loro id erano p1, p2... p27)
    await sql`DELETE FROM products WHERE id LIKE 'p%' AND length(id) <= 3`;

    const uniqueCategoriesMap = new Map();
    for (const p of offResults.products) {
      if (!uniqueCategoriesMap.has(p.category)) {
        uniqueCategoriesMap.set(p.category, p);
      }
    }

    const categoryQueries = Array.from(uniqueCategoriesMap.values()).map(p => sql`
      INSERT INTO categories (id, label, emoji, color)
      VALUES (${p.category}, ${p.categoryLabel || p.category}, ${p.emoji}, ${p.categoryColor || '#6366f1'})
      ON CONFLICT (id) DO NOTHING
    `);

    const productQueries = rowsToInsert.map(r => sql`
            INSERT INTO products (
        id, name_enc, description_enc, category, emoji, tags,
        lactose_level, is_lactose_free, is_custom, user_id,
        image_url, image_thumbnail_url, blob_pathname, nutriscore, nova_group,
        ecoscore, allergens, ingredients_text, brand, quantity
      ) VALUES (
        ${r.id}, ${r.name_enc}, ${r.description_enc}, ${r.category}, ${r.emoji}, ${r.tags},
        ${r.lactose_level}, ${r.is_lactose_free}, ${r.is_custom}, ${r.user_id},
        ${r.image_url}, ${r.image_thumbnail_url}, ${r.blob_pathname}, ${r.nutriscore}, ${r.nova_group},
        ${r.ecoscore}, ${r.allergens}, ${r.ingredients_text}, ${r.brand}, ${r.quantity}
      )
      ON CONFLICT (id) DO UPDATE SET
        name_enc = EXCLUDED.name_enc,
        description_enc = EXCLUDED.description_enc,
        category = EXCLUDED.category,
        emoji = EXCLUDED.emoji,
        tags = EXCLUDED.tags,
        lactose_level = EXCLUDED.lactose_level,
        is_lactose_free = EXCLUDED.is_lactose_free,
        image_url = COALESCE(EXCLUDED.image_url, products.image_url),
        image_thumbnail_url = COALESCE(EXCLUDED.image_thumbnail_url, products.image_thumbnail_url),
        blob_pathname = COALESCE(EXCLUDED.blob_pathname, products.blob_pathname),
        nutriscore = EXCLUDED.nutriscore,
        nova_group = EXCLUDED.nova_group,
        ecoscore = EXCLUDED.ecoscore,
        allergens = EXCLUDED.allergens,
        ingredients_text = EXCLUDED.ingredients_text,
        brand = EXCLUDED.brand,
        quantity = EXCLUDED.quantity
    `);

    await sql.transaction([...categoryQueries, ...productQueries]);

    return Response.json({ 
      success: true, 
      count: offResults.products.length, 
      products: offResults.products,
      pageCount: offResults.pageCount,
      totalCount: offResults.count,
      currentPage: offResults.page
    });

  } catch (err) {
    console.error('POST /api/admin/auto-import:', err);
    return Response.json({ error: 'Errore durante l\'importazione dei prodotti da OFF' }, { status: 500 });
  }
}
