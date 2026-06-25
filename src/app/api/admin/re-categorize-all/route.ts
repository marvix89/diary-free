import { auth } from '@/lib/auth';
import { ensureSchema, getDb } from '@/lib/db';
import { OpenFoodFactsProvider } from '@/lib/product-enrichment/providers/open-food-facts';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Accesso negato: richiesti permessi di amministratore' }, { status: 403 });
  }

  try {
    let onlyCustom = false;
    try {
      const body = await req.json();
      if (body?.onlyCustomCategory) onlyCustom = true;
    } catch {
      // Nessun body
    }

    await ensureSchema();
    const sql = getDb();

    // 1. Recupera i prodotti
    const products = onlyCustom
      ? (await sql`SELECT id, name_enc, description_enc, tags, category, emoji FROM products WHERE category = 'personalizzato'`) as any[]
      : (await sql`SELECT id, name_enc, description_enc, tags, category, emoji FROM products`) as any[];

    const provider = new OpenFoodFactsProvider();
    const updates: { id: string; catId: string; label: string; emoji: string; color: string }[] = [];
    const uniqueCats = new Map<string, { id: string; label: string; emoji: string; color: string }>();

    for (const p of products) {
      const cat = provider.categorizeProduct({
        name_enc: p.name_enc,
        description_enc: p.description_enc,
        tags: p.tags || []
      });

      uniqueCats.set(cat.id, cat);

      if (cat.id !== p.category || cat.emoji !== p.emoji) {
        updates.push({
          id: p.id,
          catId: cat.id,
          label: cat.label,
          emoji: cat.emoji,
          color: cat.color
        });
      }
    }

    // 2. Inserisci tutte le nuove categorie individuate
    for (const cat of uniqueCats.values()) {
      await sql`
        INSERT INTO categories (id, label, emoji, color)
        VALUES (${cat.id}, ${cat.label}, ${cat.emoji}, ${cat.color})
        ON CONFLICT (id) DO UPDATE SET
          label = EXCLUDED.label,
          emoji = EXCLUDED.emoji,
          color = EXCLUDED.color
      `;
    }

    // 3. Esegui gli aggiornamenti sui prodotti a blocchi di 50 per massima velocità
    const chunkSize = 50;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(u => sql`
          UPDATE products
          SET category = ${u.catId}, emoji = ${u.emoji}
          WHERE id = ${u.id}
        `)
      );
    }

    return Response.json({
      success: true,
      totalAnalyzed: products.length,
      updatedCount: updates.length
    });
  } catch (err) {
    console.error('POST /api/admin/re-categorize-all:', err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
