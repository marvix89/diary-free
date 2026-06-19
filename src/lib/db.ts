import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { PRODUCTS } from '@/data/products';

let schemaReady = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlFn = NeonQueryFunction<any, any>;

function getDb(): SqlFn {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL non impostata');
  return neon(url) as SqlFn;
}

export { getDb };

/**
 * Crea le tabelle se non esistono e fa il seed dei prodotti statici.
 * Idempotente — sicuro da chiamare ad ogni request.
 */
export async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      email         TEXT        NOT NULL UNIQUE,
      name_enc      TEXT,
      password_hash TEXT        NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id              TEXT        PRIMARY KEY,
      name_enc        TEXT        NOT NULL,
      description_enc TEXT        NOT NULL,
      category        TEXT        NOT NULL,
      emoji           TEXT        NOT NULL,
      tags            TEXT[]      NOT NULL DEFAULT '{}',
      lactose_level   TEXT        NOT NULL DEFAULT 'none',
      is_lactose_free BOOLEAN     NOT NULL DEFAULT true,
      is_custom       BOOLEAN     NOT NULL DEFAULT false,
      user_id         UUID        REFERENCES users(id) ON DELETE CASCADE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, product_id)
    )
  `;

  await seedStaticProducts(sql);
  schemaReady = true;
}

async function seedStaticProducts(sql: SqlFn): Promise<void> {
  for (const product of PRODUCTS) {
    await sql`
      INSERT INTO products (
        id, name_enc, description_enc, category, emoji, tags,
        lactose_level, is_lactose_free, is_custom, user_id
      )
      VALUES (
        ${product.id},
        ${product.name},
        ${product.description},
        ${product.category},
        ${product.emoji},
        ${product.tags},
        ${product.lactoseLevel ?? 'none'},
        ${product.isLactoseFree},
        false,
        NULL
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
}
