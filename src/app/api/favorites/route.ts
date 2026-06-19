import { auth } from '@/lib/auth';
import { ensureSchema, getDb } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    await ensureSchema();
    const sql = getDb();

    const rows = await sql`
      SELECT product_id FROM favorites WHERE user_id = ${session.user.id}
    ` as Record<string, unknown>[];

    return Response.json(rows.map((r) => r.product_id as string));
  } catch (err) {
    console.error('GET /api/favorites:', err);
    return Response.json({ error: 'Errore nel recupero preferiti' }, { status: 500 });
  }
}
