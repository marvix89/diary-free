import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

/**
 * GET /api/images/[id]
 *
 * Proxy sicuro per servire immagini prodotto.
 * Il frontend usa questo endpoint come src dell'<img>, non l'URL diretto del Blob.
 *
 * Flusso:
 *   1. Autentica la richiesta (solo utenti loggati)
 *   2. Recupera blob_pathname + image_url da Postgres
 *   3. Scarica il file dal Blob Storage via fetch
 *   4. Streamma il binario al client con gli header corretti
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Non autorizzato', { status: 401 });
  }

  try {
    const { id } = await params;
    const sql = getDb();

    // Recupera metadati immagine dal DB
    const [row] = await sql`
      SELECT image_url, blob_pathname, image_thumbnail_url
      FROM products
      WHERE id = ${id}
    ` as Record<string, string | null>[];

    if (!row) {
      return new Response('Prodotto non trovato', { status: 404 });
    }

    // Usa image_url (URL Blob diretto) o image_thumbnail_url come fallback
    const blobUrl = row.image_url || row.image_thumbnail_url;

    if (!blobUrl) {
      return new Response('Nessuna immagine disponibile', { status: 404 });
    }

    // Scarica il file dal Blob Storage
    // I blob privati richiedono il token di autenticazione come header Authorization
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    const blobRes = await fetch(blobUrl, {
      headers: {
        'User-Agent': 'diary-free/1.0 (image-proxy)',
        ...(blobToken ? { 'Authorization': `Bearer ${blobToken}` } : {}),
      },
    });

    if (!blobRes.ok) {
      console.error(`Image proxy: Blob fetch failed for product ${id}, status ${blobRes.status}`);
      return new Response('Immagine non disponibile', { status: 502 });
    }

    const contentType = blobRes.headers.get('content-type') || 'image/jpeg';
    const body = await blobRes.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': body.byteLength.toString(),
        // Cache pubblica per 1 ora, rivalidabile
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'X-Image-Source': 'blob-proxy',
      },
    });

  } catch (err) {
    console.error('GET /api/images/[id]:', err);
    return new Response('Errore interno del server', { status: 500 });
  }
}
