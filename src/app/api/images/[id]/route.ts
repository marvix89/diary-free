import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

/**
 * GET /api/images/[id]
 *
 * Proxy sicuro per servire immagini prodotto direttamente dal Vercel Blob privato.
 * Usa blob_pathname + BLOB_READ_WRITE_TOKEN per autenticarsi al Blob Storage.
 *
 * Flusso:
 *   1. Verifica autenticazione utente
 *   2. Legge blob_pathname da Postgres
 *   3. Costruisce l'URL Blob usando BLOB_STORE_ID + blob_pathname
 *   4. Scarica il file dal Blob con token di autenticazione
 *   5. Streamma il binario al client con header di caching
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

    // Legge solo blob_pathname — unica fonte di verità per le immagini
    const [row] = await sql`
      SELECT blob_pathname FROM products WHERE id = ${id}
    ` as { blob_pathname: string | null }[];

    if (!row) {
      return new Response('Prodotto non trovato', { status: 404 });
    }

    if (!row.blob_pathname) {
      return new Response('Nessuna immagine disponibile', { status: 404 });
    }

    // Costruisce l'URL del Blob privato:
    // BLOB_STORE_ID = "store_7okYZKYqUlBbsKlg" → storeId = "7okYZKYqUlBbsKlg"
    // URL = https://<storeId>.blob.vercel-storage.com/<blob_pathname>
    const storeId = (process.env.BLOB_STORE_ID ?? '').replace('store_', '');
    if (!storeId) {
      console.error('BLOB_STORE_ID non configurato');
      return new Response('Configurazione Blob mancante', { status: 500 });
    }

    const blobUrl = `https://${storeId}.blob.vercel-storage.com/${row.blob_pathname}`;
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    // Scarica il file dal Blob con autenticazione token
    const blobRes = await fetch(blobUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'diary-free/1.0 (image-proxy)',
      },
    });

    if (!blobRes.ok) {
      console.error(`Image proxy: Blob fetch failed for product ${id} (${blobRes.status}) — pathname: ${row.blob_pathname}`);
      return new Response('Immagine non disponibile', { status: 502 });
    }

    const contentType = blobRes.headers.get('content-type') || 'image/jpeg';
    const body = await blobRes.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': body.byteLength.toString(),
        // Cache per 1 ora, rivalidabile fino a 24h
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'X-Image-Source': 'vercel-blob-private',
      },
    });

  } catch (err) {
    console.error('GET /api/images/[id]:', err);
    return new Response('Errore interno del server', { status: 500 });
  }
}
