import { auth } from '@/lib/auth';
import { safeDecrypt } from '@/lib/crypto';
import { ensureSchema, getDb } from '@/lib/db';
import type { Product } from '@/types';
import { getProductImageProxyUrl } from '@/lib/image-utils';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    await ensureSchema();
    const sql = getDb();

    const rows = await sql`
      SELECT p.* FROM favorites f
      JOIN products p ON f.product_id = p.id
      WHERE f.user_id = ${session.user.id}
      ORDER BY f.created_at DESC
    ` as Record<string, unknown>[];

    const products: Product[] = rows.map((row) => {
      if (row.is_custom) {
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
          enrichment: row.blob_pathname ? {
            imageUrl: getProductImageProxyUrl(row.id as string),
            imageThumbnailUrl: getProductImageProxyUrl(row.id as string),
          } : undefined,
        };
      } else {
        return {
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
            imageUrl: row.blob_pathname
              ? getProductImageProxyUrl(row.id as string)
              : undefined,
            imageThumbnailUrl: row.blob_pathname
              ? getProductImageProxyUrl(row.id as string)
              : undefined,
            ingredientsText: row.ingredients_text as string,
            nutriScore: row.nutriscore as any,
            novaGroup: row.nova_group as 1 | 2 | 3 | 4 | undefined,
            ecoScore: row.ecoscore as any,
            allergens: row.allergens as string[],
            labels: row.tags as string[],
          }
        };
      }
    });

    return Response.json(products);
  } catch (err) {
    console.error('GET /api/favorites:', err);
    return Response.json({ error: 'Errore nel recupero preferiti' }, { status: 500 });
  }
}
