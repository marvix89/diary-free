import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { unstable_cache } from 'next/cache';

/**
 * GET /api/images/[id]
 *
 * Proxy sicuro per servire immagini prodotto dal Vercel Blob privato.
 *
 * Strategia di caching (risparmio Simple Operations Vercel Blob):
 *   - `unstable_cache` di Next.js: persiste il blob_pathname tra invocazioni serverless.
 *     Revalidazione automatica ogni 24h. Tag `product-image-{id}` per invalidazione selettiva.
 *   - Cache-Control browser: 24h + stale-while-revalidate 7 giorni.
 *   - ETag + 304 Not Modified: nessun byte trasferito se l'immagine non è cambiata.
 */

// Cache del blob_pathname per prodotto (evita la query DB per ogni richiesta immagine).
// unstable_cache è il Data Cache di Next.js: persiste tra invocazioni serverless su Vercel.
const getCachedBlobPathname = unstable_cache(
  async (productId: string): Promise<string | null> => {
    const sql = getDb();
    const [row] = await sql`
      SELECT blob_pathname FROM products WHERE id = ${productId}
    ` as { blob_pathname: string | null }[];
    return row?.blob_pathname ?? null;
  },
  ['product-blob-pathname'],
  {
    revalidate: 86400, // 24 ore
    tags: ['product-images'],
  }
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Non autorizzato', { status: 401 });
  }

  try {
    const { id } = await params;

    // ─── 1. Legge blob_pathname (dalla cache Next.js o dal DB) ───────
    const blobPathname = await getCachedBlobPathname(id);

    if (!blobPathname) {
      return new Response('Nessuna immagine disponibile', { status: 404 });
    }

    // ─── 2. ETag basato sul pathname — supporta HTTP 304 ────────────
    const etag = `"${Buffer.from(blobPathname).toString('base64url').slice(0, 16)}"`;
    if (request.headers.get('if-none-match') === etag) {
      return new Response(null, { status: 304 });
    }

    // ─── 3. Costruisce URL Blob e scarica ───────────────────────────
    const storeId = (process.env.BLOB_STORE_ID ?? '').replace('store_', '');
    if (!storeId) {
      console.error('BLOB_STORE_ID non configurato');
      return new Response('Configurazione Blob mancante', { status: 500 });
    }

    const blobUrl = `https://${storeId}.blob.vercel-storage.com/${blobPathname}`;
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    const blobRes = await fetch(blobUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'diary-free/1.0 (image-proxy)',
      },
      // Next.js cache anche la risposta del fetch (separato dall'unstable_cache sopra)
      next: { revalidate: 86400 },
    });

    if (!blobRes.ok) {
      console.error(
        `Image proxy: Blob fetch failed for product ${id} (${blobRes.status}) — pathname: ${blobPathname}`
      );
      return new Response('Immagine non disponibile', { status: 502 });
    }

    const contentType = blobRes.headers.get('content-type') || 'image/jpeg';
    const data = await blobRes.arrayBuffer();

    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // 24h browser cache + 7 giorni stale-while-revalidate
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'ETag': etag,
        'X-Image-Source': 'vercel-blob',
      },
    });

  } catch (err) {
    console.error('GET /api/images/[id]:', err);
    return new Response('Errore interno del server', { status: 500 });
  }
}
