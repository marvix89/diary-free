import { auth } from '@/lib/auth';
import { ensureSchema, getDb } from '@/lib/db';
import { put } from '@vercel/blob';

/**
 * POST /api/admin/sync-images
 *
 * Endpoint dedicato alla sincronizzazione delle immagini prodotto su Vercel Blob.
 * Separato dall'import dati per non bloccare l'importazione in caso di errori Blob.
 *
 * Body:
 *   page     (number) — pagina corrente (default 1)
 *   pageSize (number) — prodotti per pagina (default 20)
 *
 * Logica per ogni prodotto:
 *   1. Cerca prodotti senza blob_pathname (immagine non ancora sincronizzata)
 *   2. Scarica l'immagine da image_url (URL OpenFoodFacts)
 *   3. Carica su Vercel Blob (privato)
 *   4. Aggiorna blob_pathname e image_url in Postgres
 *
 * Risposta:
 *   { processed, succeeded, failed, totalPending, page, totalPages }
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Accesso negato: richiesti permessi di amministratore' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const page = parseInt(body.page || '1', 10);
    const pageSize = parseInt(body.pageSize || '20', 10);
    const offset = (page - 1) * pageSize;

    await ensureSchema();
    const sql = getDb();

    // Conta totale prodotti senza immagine Blob
    const [countRow] = await sql`
      SELECT count(*)::int AS total FROM products
      WHERE is_custom = false
        AND blob_pathname IS NULL
        AND image_url IS NOT NULL
        AND image_url ILIKE '%openfoodfacts.org%'
    ` as { total: number }[];

    const totalPending = countRow?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalPending / pageSize));

    // Recupera la pagina corrente
    const rows = await sql`
      SELECT id, image_url, image_thumbnail_url FROM products
      WHERE is_custom = false
        AND blob_pathname IS NULL
        AND image_url IS NOT NULL
        AND image_url ILIKE '%openfoodfacts.org%'
      ORDER BY created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    ` as { id: string; image_url: string; image_thumbnail_url: string | null }[];

    let succeeded = 0;
    let failed = 0;

    for (const row of rows) {
      const imgUrl = row.image_url || row.image_thumbnail_url;
      if (!imgUrl) { failed++; continue; }

      try {
        // Scarica immagine da OFF
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(imgUrl, {
          headers: { 'User-Agent': 'diary-free/1.0 (admin-sync-images)' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          console.warn(`sync-images: fetch failed for ${row.id} (${res.status})`);
          failed++;
          continue;
        }

        const contentType = res.headers.get('content-type') || 'image/jpeg';
        const buffer = Buffer.from(await res.arrayBuffer());
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';

        // Carica su Vercel Blob
        const blob = await put(`products/${row.id}/image.${ext}`, buffer, {
          access: 'private',
          contentType,
          allowOverwrite: true,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        // Aggiorna Postgres
        await sql`
          UPDATE products
          SET blob_pathname = ${blob.pathname},
              image_url = ${blob.url},
              image_thumbnail_url = ${blob.url}
          WHERE id = ${row.id}
        `;

        succeeded++;
      } catch (err) {
        console.error(`sync-images: error for product ${row.id}:`, err);
        failed++;
      }
    }

    return Response.json({
      success: true,
      processed: rows.length,
      succeeded,
      failed,
      totalPending,
      page,
      totalPages,
    });

  } catch (err) {
    console.error('POST /api/admin/sync-images:', err);
    return Response.json({ error: 'Errore durante la sincronizzazione immagini' }, { status: 500 });
  }
}

/**
 * GET /api/admin/sync-images
 * Restituisce lo stato attuale: quanti prodotti hanno ancora bisogno di sincronizzazione immagini.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Accesso negato' }, { status: 403 });
  }

  try {
    await ensureSchema();
    const sql = getDb();

    const [stats] = await sql`
      SELECT
        count(*) FILTER (WHERE is_custom = false)::int AS total_public,
        count(*) FILTER (WHERE is_custom = false AND blob_pathname IS NOT NULL)::int AS with_blob,
        count(*) FILTER (WHERE is_custom = false AND blob_pathname IS NULL AND image_url IS NOT NULL AND image_url ILIKE '%openfoodfacts.org%')::int AS pending_blob
      FROM products
    ` as { total_public: number; with_blob: number; pending_blob: number }[];

    return Response.json(stats);
  } catch (err) {
    console.error('GET /api/admin/sync-images:', err);
    return Response.json({ error: 'Errore nel recupero statistiche' }, { status: 500 });
  }
}
