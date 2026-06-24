import { auth } from '@/lib/auth';
import { ensureSchema, getDb } from '@/lib/db';
import { OpenFoodFactsProvider } from '@/lib/product-enrichment/providers/open-food-facts';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Accesso negato: richiesti permessi di amministratore' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const locale = 'it';

    const provider = new OpenFoodFactsProvider();
    const offResults = await provider.searchProducts(q, locale, page, limit);

    if (offResults.products.length === 0) {
      return Response.json({ products: [], count: 0, page, pageSize: limit, pageCount: 0 });
    }

    // Cross-check con Neon DB
    await ensureSchema();
    const sql = getDb();

    // 1. Controlla codici a barre esatti
    const ids = offResults.products.map(p => p.id);
    const existingIdsRows = await sql`
      SELECT id FROM products WHERE id = ANY(${ids})
    `;
    const existingIds = new Set((existingIdsRows as any[]).map(row => row.id));

    // 2. Controlla nomi simili (semplice ILIKE match su nomi di prodotti che stiamo scaricando)
    // Per evitare query enormi, facciamo un set di regex match per ogni nome? Troppo lento.
    // Facciamo solo il controllo barcode, e se il nome è identico.
    const names = offResults.products.map(p => p.name);
    const existingNamesRows = await sql`
      SELECT id, name_enc FROM products WHERE name_enc = ANY(${names}) AND is_custom = false
    `;
    const existingNames = new Set((existingNamesRows as any[]).map(row => row.name_enc));

    // Arricchiamo la risposta con lo stato di conflitto
    const enrichedProducts = offResults.products.map(p => {
      let conflictStatus = 'new';
      if (existingIds.has(p.id)) {
        conflictStatus = 'exists'; // Stesso barcode
      } else if (existingNames.has(p.name)) {
        conflictStatus = 'duplicate_name'; // Stesso nome
      }
      return { ...p, conflictStatus };
    });

    return Response.json({
      ...offResults,
      products: enrichedProducts
    });

  } catch (err) {
    console.error('GET /api/admin/off-search:', err);
    return Response.json({ error: 'Errore durante la ricerca su OFF' }, { status: 500 });
  }
}
