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
  // Cleanup di tabelle non più in uso
  await sql`DROP TABLE IF EXISTS product_translations`;

  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id         TEXT        PRIMARY KEY,
      label      TEXT        NOT NULL,
      emoji      TEXT        NOT NULL DEFAULT '🏷️',
      color      TEXT        NOT NULL DEFAULT '#6366f1',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    INSERT INTO categories (id, label, emoji, color) VALUES
      ('alternative-vegetali', 'Alternative Vegetali', '🥛', '#7c3aed'),
      ('formaggi', 'Formaggi & Spalmabili', '🧀', '#d97706'),
      ('yogurt-dessert', 'Yogurt & Dessert', '🫙', '#16a34a'),
      ('dolci-biscotti', 'Dolci & Biscotti', '🍪', '#be185d'),
      ('gelati', 'Gelati', '🍦', '#0891b2'),
      ('piatti-pronti', 'Piatti Pronti', '🍳', '#b45309'),
      ('personalizzato', 'Personalizzato', '⭐', '#f59e0b')
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      email         TEXT        NOT NULL UNIQUE,
      name_enc      TEXT,
      password_hash TEXT        NOT NULL,
      reset_token   TEXT,
      reset_token_expires TIMESTAMPTZ,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_admin      BOOLEAN     NOT NULL DEFAULT false
    )
  `;

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false`;

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
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      -- Enrichment columns
      image_url           TEXT,
      image_thumbnail_url TEXT,
      blob_pathname       TEXT,        -- percorso nel Vercel Blob (es. products/id/image.jpg)
      nutriscore          TEXT,
      nova_group          INT,
      ecoscore            TEXT,
      allergens           TEXT[],
      ingredients_text    TEXT,
      nutriments          JSONB,
      brand               TEXT,
      quantity            TEXT
    )
  `;

  // Add enrichment columns if the table already exists
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_thumbnail_url TEXT`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS nutriscore TEXT`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS nova_group INT`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS ecoscore TEXT`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS allergens TEXT[]`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS ingredients_text TEXT`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS nutriments JSONB`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity TEXT`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS blob_pathname TEXT`;

  // Tabella di registro per i file caricati sul Blob Storage
  await sql`
    CREATE TABLE IF NOT EXISTS product_images (
      id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      product_id   TEXT        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      blob_pathname TEXT       NOT NULL,
      content_type TEXT        NOT NULL DEFAULT 'image/jpeg',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

  schemaReady = true;
}
