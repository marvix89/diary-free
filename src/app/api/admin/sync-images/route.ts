import { auth } from '@/lib/auth';
import { ensureSchema, getDb } from '@/lib/db';
import { put } from '@vercel/blob';

/**
 * POST /api/admin/sync-images
 *
 * Sincronizza le immagini prodotto su Vercel Blob (store privato).
 * Usa off_image_url (URL originale OpenFoodFacts) come sorgente.
 * Imposta blob_pathname al termine — il proxy usa solo questo campo.
 *
 * Body: { page, pageSize }
 * Risposta: { processed, succeeded, failed, totalPending, page, totalPages }
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

    // Prodotti con URL OFF ma ancora senza blob_pathname
    const [countRow] = await sql`
      SELECT count(*)::int AS total FROM products
      WHERE is_custom = false
        AND blob_pathname IS NULL
        AND off_image_url IS NOT NULL
    ` as { total: number }[];

    const totalPending = countRow?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalPending / pageSize));

    const rows = await sql`
      SELECT id, off_image_url FROM products
      WHERE is_custom = false
        AND blob_pathname IS NULL
        AND off_image_url IS NOT NULL
      ORDER BY created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    ` as { id: string; off_image_url: string }[];

    let succeeded = 0;
    let failed = 0;

    for (const row of rows) {
      if (!row.off_image_url) { failed++; continue; }

      try {
        // Scarica immagine da OpenFoodFacts
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(row.off_image_url, {
          headers: { 'User-Agent': 'diary-free/1.0 (admin-sync-images)' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          console.warn(`sync-images: fetch failed for product ${row.id} (HTTP ${res.status})`);
          failed++;
          continue;
        }

        const contentType = res.headers.get('content-type') || 'image/jpeg';
        const buffer = Buffer.from(await res.arrayBuffer());
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';

        // Carica su Vercel Blob privato
        const blob = await put(`products/${row.id}/image.${ext}`, buffer, {
          access: 'private',
          contentType,
          allowOverwrite: true,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        // Aggiorna solo blob_pathname — il proxy usa questo campo per costruire l'URL
        await sql`
          UPDATE products
          SET blob_pathname = ${blob.pathname}
          WHERE id = ${row.id}
        `;

        succeeded++;
      } catch (err) {
        console.error(`sync-images: errore per prodotto ${row.id}:`, err);
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
 * Statistiche: quanti prodotti hanno blob_pathname vs quanti ne hanno ancora bisogno.
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
        count(*) FILTER (WHERE is_custom = false AND blob_pathname IS NULL AND off_image_url IS NOT NULL)::int AS pending_blob
      FROM products
    ` as { total_public: number; with_blob: number; pending_blob: number }[];

    return Response.json(stats);
  } catch (err) {
    console.error('GET /api/admin/sync-images:', err);
    return Response.json({ error: 'Errore nel recupero statistiche' }, { status: 500 });
  }
}
