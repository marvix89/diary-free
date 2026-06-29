import { auth } from '@/lib/auth';
import { ensureSchema, getDb } from '@/lib/db';
import { put } from '@vercel/blob';

/**
 * POST /api/images/upload
 *
 * Riceve un FormData con:
 *   - file: File — il file immagine
 *   - productId: string — l'ID del prodotto a cui associare l'immagine
 *
 * Flusso:
 *   1. Salva il file nel Vercel Blob Storage (accesso privato)
 *   2. Salva i metadati in Postgres (tabella product_images + colonna blob_pathname in products)
 *   3. Restituisce l'URL proxy per accedere all'immagine: /api/images/<productId>
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const productId = formData.get('productId') as string | null;

    if (!file || !productId) {
      return Response.json({ error: 'File e productId obbligatori' }, { status: 400 });
    }

    // Valida il tipo MIME
    if (!file.type.startsWith('image/')) {
      return Response.json({ error: 'Sono accettati solo file immagine' }, { status: 400 });
    }

    // Limita a 5 MB
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: 'Il file non può superare i 5 MB' }, { status: 400 });
    }

    const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg';
    const pathname = `products/${productId}/image.${ext}`;

    // 1. Upload sul Blob Storage (privato)
    const blob = await put(pathname, file, {
      access: 'private',
      contentType: file.type,
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    await ensureSchema();
    const sql = getDb();

    // Verifica che il prodotto appartenga all'utente (o che l'utente sia admin)
    const [productRow] = await sql`
      SELECT id, user_id, is_custom FROM products WHERE id = ${productId}
    ` as Record<string, unknown>[];

    if (!productRow) {
      return Response.json({ error: 'Prodotto non trovato' }, { status: 404 });
    }

    const isAdmin = !!session.user.isAdmin;
    const isOwner = productRow.user_id === session.user.id;

    if (!isAdmin && !isOwner) {
      return Response.json({ error: 'Non autorizzato a modificare questo prodotto' }, { status: 403 });
    }

    // 2a. Registra in product_images
    await sql`
      INSERT INTO product_images (product_id, blob_pathname, content_type)
      VALUES (${productId}, ${blob.pathname}, ${file.type})
      ON CONFLICT DO NOTHING
    `;

    // 2b. Aggiorna solo blob_pathname in products (l'unica colonna usata dal proxy)
    await sql`
      UPDATE products
      SET blob_pathname = ${blob.pathname}
      WHERE id = ${productId}
    `;

    // 3. Restituisce l'URL proxy
    const proxyUrl = `/api/images/${productId}`;

    return Response.json({
      success: true,
      proxyUrl,
      blobPathname: blob.pathname,
      blobUrl: blob.url,
    }, { status: 201 });

  } catch (err) {
    console.error('POST /api/images/upload:', err);
    return Response.json({ error: 'Errore durante l\'upload dell\'immagine' }, { status: 500 });
  }
}
