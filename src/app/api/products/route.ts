import { auth } from '@/lib/auth';
import { encrypt, safeDecrypt } from '@/lib/crypto';
import { ensureSchema, getDb } from '@/lib/db';
import type { Product } from '@/types';
import { cookies } from 'next/headers';
import { OpenFoodFactsProvider } from '@/lib/product-enrichment/providers/open-food-facts';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);

    const cookieStore = await cookies();
    const locale = cookieStore.get('NEXT_LOCALE')?.value ?? 'it';

    const provider = new OpenFoodFactsProvider();
    const result = await provider.searchProducts(q, locale, page, limit);

    return Response.json(result);
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
