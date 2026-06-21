import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { PRODUCTS } from '@/data/products';
import { PRODUCTS_EN } from '@/data/products_en';

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

  // Add enrichment columns if the table already exists but without these columns
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

  await sql`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, product_id)
    )
  `;

  // Tabella traduzioni: una riga per ogni (prodotto, lingua)
  await sql`
    CREATE TABLE IF NOT EXISTS product_translations (
      product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      locale      TEXT NOT NULL,
      name        TEXT NOT NULL,
      description TEXT NOT NULL,
      PRIMARY KEY (product_id, locale)
    )
  `;

  await seedStaticProducts(sql);
  schemaReady = true;
}

async function seedStaticProducts(sql: SqlFn): Promise<void> {
  for (const product of PRODUCTS) {
    // Inserisce il prodotto base (nome/descrizione in italiano come fallback)
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

    // Traduzione italiana
    await sql`
      INSERT INTO product_translations (product_id, locale, name, description)
      VALUES (${product.id}, 'it', ${product.name}, ${product.description})
      ON CONFLICT (product_id, locale) DO NOTHING
    `;

    // Traduzione inglese (se disponibile)
    const en = PRODUCTS_EN[product.id];
    if (en) {
      await sql`
        INSERT INTO product_translations (product_id, locale, name, description)
        VALUES (${product.id}, 'en', ${en.name}, ${en.description})
        ON CONFLICT (product_id, locale) DO NOTHING
      `;
    }
  }
}
