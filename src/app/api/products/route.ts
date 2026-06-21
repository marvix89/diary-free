import { auth } from '@/lib/auth';
import { encrypt, safeDecrypt } from '@/lib/crypto';
import { ensureSchema, getDb } from '@/lib/db';
import type { Product } from '@/types';
import { cookies } from 'next/headers';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    await ensureSchema();
    const sql = getDb();

    // Legge la lingua dal cookie impostato da next-intl
    const cookieStore = await cookies();
    const locale = cookieStore.get('NEXT_LOCALE')?.value ?? 'it';

    // JOIN con product_translations: usa la traduzione se disponibile,
    // altrimenti (per i prodotti custom o senza traduzione) usa il valore base
    const rows = await sql`
      SELECT
        p.id,
        p.category,
        p.emoji,
        p.tags,
        p.lactose_level,
        p.is_lactose_free,
        p.is_custom,
        p.user_id,
        p.image_url,
        p.image_thumbnail_url,
        p.nutriscore,
        p.nova_group,
        p.ecoscore,
        p.allergens,
        p.ingredients_text,
        p.nutriments,
        p.brand,
        p.quantity,
        COALESCE(pt.name,        p.name_enc)        AS name_enc,
        COALESCE(pt.description, p.description_enc) AS description_enc
      FROM products p
      LEFT JOIN product_translations pt
        ON pt.product_id = p.id AND pt.locale = ${locale}
      WHERE p.user_id IS NULL OR p.user_id = ${session.user.id}
      ORDER BY p.created_at ASC
    ` as Record<string, unknown>[];

    const products: Product[] = rows.map((row) => {
      const p: Product = {
        id: row.id as string,
        name: safeDecrypt(row.name_enc as string, row.is_custom as boolean),
        description: safeDecrypt(row.description_enc as string, row.is_custom as boolean),
        category: row.category as Product['category'],
        emoji: row.emoji as string,
        tags: (row.tags as string[]) ?? [],
        isLactoseFree: row.is_lactose_free as boolean,
        lactoseLevel: row.lactose_level as 'none' | 'trace' | 'low',
        isCustom: row.is_custom as boolean,
      };

      // Add enrichment if any enrichment field is present
      if (row.image_thumbnail_url || row.nutriscore || row.brand) {
        p.enrichment = {
          imageUrl: row.image_url as string | undefined,
          imageThumbnailUrl: row.image_thumbnail_url as string | undefined,
          nutriScore: row.nutriscore as any,
          novaGroup: row.nova_group as any,
          ecoScore: row.ecoscore as any,
          allergens: row.allergens as string[] | undefined,
          ingredientsText: row.ingredients_text as string | undefined,
          nutriments: row.nutriments as any,
          brand: row.brand as string | undefined,
          quantity: row.quantity as string | undefined,
        };
        
        // Pulizia campi undefined
        Object.keys(p.enrichment).forEach(key => {
          if (p.enrichment![key as keyof typeof p.enrichment] === null || p.enrichment![key as keyof typeof p.enrichment] === undefined) {
             delete p.enrichment![key as keyof typeof p.enrichment];
          }
        });
      }

      return p;
    });

    return Response.json(products);
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
