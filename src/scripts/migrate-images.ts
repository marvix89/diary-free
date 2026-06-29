/**
 * migrate-images.ts
 * Scarica le immagini full-size da Open Food Facts e le carica su Vercel Blob.
 * Aggiorna image_url nel DB Neon con la nuova URL permanente.
 *
 * Esegui con: npm run migrate-images
 */

import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const OFF_DOMAIN = 'images.openfoodfacts.org';
const DELAY_MS = 200; // rispetta le policy di Open Food Facts

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (!dbUrl) { console.error('❌ DATABASE_URL mancante in .env.local'); process.exit(1); }
  if (!blobToken) { console.error('❌ BLOB_READ_WRITE_TOKEN mancante in .env.local'); process.exit(1); }

  const sql = neon(dbUrl);

  console.log('🔍 Carico prodotti da migrare...');

  // Prodotti con image_url o image_thumbnail_url ancora su Open Food Facts
  const rows = await sql`
    SELECT id, COALESCE(image_url, image_thumbnail_url) as source_url
    FROM products
    WHERE is_custom = false
      AND (image_url LIKE ${'%' + OFF_DOMAIN + '%'} OR image_thumbnail_url LIKE ${'%' + OFF_DOMAIN + '%'})
    ORDER BY id
  `;

  console.log(`📦 ${rows.length} prodotti da migrare.\n`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows as { id: string; source_url: string }[]) {
    const { id, source_url } = row;

    try {
      console.log(`[${id}] Scarico: ${source_url}`);

      const response = await fetch(source_url, {
        headers: { 'User-Agent': 'diary-free/1.0 (image-migration-script)' },
      });

      if (!response.ok) {
        console.warn(`  ⚠️  HTTP ${response.status} — skippato.`);
        skipped++;
        await sleep(DELAY_MS);
        continue;
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const buffer = Buffer.from(await response.arrayBuffer());
      const ext = contentType.includes('png') ? 'png' : 'jpg';

      // Carica su Vercel Blob
      const blob = await put(`products/${id}/image.${ext}`, buffer, {
        access: 'public',
        contentType,
        token: blobToken,
      });

      // Aggiorna sia image_url che image_thumbnail_url nel DB
      await sql`
        UPDATE products
        SET image_url = ${blob.url}, image_thumbnail_url = ${blob.url}
        WHERE id = ${id}
      `;

      console.log(`  ✅ Migrato → ${blob.url}`);
      migrated++;
    } catch (err) {
      console.error(`  ❌ Errore per ${id}:`, err);
      errors++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Migrati  : ${migrated}
⏭️  Skippati : ${skipped}
❌ Errori   : ${errors}
━━━━━━━━━━━━━━━━━━━━━━━━━`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Errore fatale:', err);
  process.exit(1);
});
