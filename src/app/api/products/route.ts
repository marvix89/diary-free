import { auth } from '@/lib/auth';
import { encrypt, safeDecrypt } from '@/lib/crypto';
import { ensureSchema, getDb } from '@/lib/db';
import type { Product } from '@/types';
import { cookies } from 'next/headers';
import { OpenFoodFactsProvider } from '@/lib/product-enrichment/providers/open-food-facts';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);

    await ensureSchema();
    const sql = getDb();

    // Per i prodotti pubblici usiamo ILIKE (essendo in chiaro nel DB)
    const queryFilter = q ? `%${q}%` : '%';
    const offset = (page - 1) * limit;

    const [publicRows, countRows] = await Promise.all([
      sql`
        SELECT * FROM products 
        WHERE is_custom = false AND name_enc ILIKE ${queryFilter}
          AND (${category} = '' OR category = ${category})
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`
        SELECT count(*) as total FROM products 
        WHERE is_custom = false AND name_enc ILIKE ${queryFilter}
          AND (${category} = '' OR category = ${category})
      `
    ]);

    // I prodotti custom sono cifrati, li carichiamo tutti per l'utente,
    // li decifriamo e li filtriamo in JS.
    const customRows = await sql`
      SELECT * FROM products WHERE is_custom = true AND user_id = ${session.user.id}
        AND (${category} = '' OR category = ${category})
    `;

    const customProducts: Product[] = (customRows as any[]).map((row) => {
      const name = safeDecrypt(row.name_enc as string, true);
      const desc = safeDecrypt(row.description_enc as string, true);
      return {
        id: row.id as string,
        name,
        description: desc,
        category: row.category as Product['category'],
        emoji: row.emoji as string,
        tags: (row.tags as string[]) || [],
        isLactoseFree: row.is_lactose_free as boolean,
        lactoseLevel: row.lactose_level as Product['lactoseLevel'],
        isCustom: true,
      };
    }).filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.description.toLowerCase().includes(q.toLowerCase()));

    const publicProducts: Product[] = (publicRows as any[]).map((row) => ({
      id: row.id as string,
      name: row.name_enc as string,
      description: row.description_enc as string,
      category: row.category as Product['category'],
      emoji: row.emoji as string,
      tags: (row.tags as string[]) || [],
      isLactoseFree: row.is_lactose_free as boolean,
      lactoseLevel: row.lactose_level as Product['lactoseLevel'],
      isCustom: false,
      enrichment: {
        brand: row.brand as string,
        quantity: row.quantity as string,
        imageUrl: row.image_url as string,
        imageThumbnailUrl: row.image_thumbnail_url as string,
        ingredientsText: row.ingredients_text as string,
        nutriScore: row.nutriscore as any,
        novaGroup: row.nova_group as 1 | 2 | 3 | 4 | undefined,
        ecoScore: row.ecoscore as any,
        allergens: row.allergens as string[],
        labels: row.tags as string[],
      }
    }));

    // Se siamo alla prima pagina mostriamo i custom in cima, altrimenti solo i pubblici
    const combinedProducts = page === 1 ? [...customProducts, ...publicProducts] : publicProducts;
    const totalCount = parseInt((countRows as any[])[0].total) + customProducts.length;

    return Response.json({
      products: combinedProducts,
      count: totalCount,
      page,
      pageSize: limit,
      pageCount: Math.ceil(totalCount / limit)
    });
  } catch (err) {
    console.error('GET /api/products:', err);
    return Response.json({ error: 'Errore nel recupero prodotti' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, category, emoji, tags, lactoseLevel, isLactoseFree } = body;

    if (!name?.trim() || !description?.trim()) {
      return Response.json({ error: 'Nome e descrizione obbligatori' }, { status: 400 });
    }

    await ensureSchema();
    const sql = getDb();

    const id = `custom-${session.user.id}-${Date.now()}`;
    const nameEnc = encrypt(name.trim());
    const descEnc = encrypt(description.trim());

    await sql`
      INSERT INTO products (
        id, name_enc, description_enc, category, emoji, tags,
        lactose_level, is_lactose_free, is_custom, user_id
      )
      VALUES (
        ${id}, ${nameEnc}, ${descEnc}, ${category}, ${emoji},
        ${tags ?? []}, ${lactoseLevel ?? 'none'}, ${isLactoseFree ?? true},
        true, ${session.user.id}
      )
    `;

    const product: Product = {
      id,
      name: name.trim(),
      description: description.trim(),
      category,
      emoji,
      tags: tags ?? [],
      isLactoseFree: isLactoseFree ?? true,
      lactoseLevel: lactoseLevel ?? 'none',
      isCustom: true,
    };

    return Response.json(product, { status: 201 });
  } catch (err) {
    console.error('POST /api/products:', err);
    return Response.json({ error: 'Errore durante il salvataggio' }, { status: 500 });
  }
}
