import { neon, type NeonQueryFunction } from '@neondatabase/serverless';


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
      reset_token   TEXT,
      reset_token_expires TIMESTAMPTZ,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ`;

  await sql`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, product_id)
    )
  `;

  schemaReady = true;
}
