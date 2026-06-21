import { neon } from '@neondatabase/serverless';
import { PRODUCT_BARCODES } from '../data/product-barcodes';
import { getEnrichmentProvider } from '../lib/product-enrichment';
import dotenv from 'dotenv';
import path from 'path';

// Carica variabili d'ambiente dal file .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('Inizio arricchimento prodotti...');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERRORE: DATABASE_URL non impostato.');
    process.exit(1);
  }

  const sql = neon(dbUrl);
  const provider = getEnrichmentProvider();

  let successCount = 0;
  let failCount = 0;

  for (const [productId, barcode] of Object.entries(PRODUCT_BARCODES)) {
    console.log(`\n[${productId}] Cerco barcode ${barcode}...`);
    
    try {
      const data = await provider.fetchByBarcode(barcode);
      
      if (!data) {
        console.log(`  ❌ Nessun dato trovato per il barcode ${barcode}.`);
        failCount++;
        continue;
      }

      console.log(`  ✅ Trovato: ${data.brand || ''} (NutriScore: ${data.nutriScore || 'N/A'})`);

      // Aggiorna il DB
      await sql`
        UPDATE products
        SET 
          image_url = ${data.imageUrl || null},
          image_thumbnail_url = ${data.imageThumbnailUrl || null},
          nutriscore = ${data.nutriScore || null},
          nova_group = ${data.novaGroup || null},
          ecoscore = ${data.ecoScore || null},
          allergens = ${data.allergens || null},
          ingredients_text = ${data.ingredientsText || null},
          nutriments = ${data.nutriments ? JSON.stringify(data.nutriments) : null},
          brand = ${data.brand || null},
          quantity = ${data.quantity || null}
        WHERE id = ${productId}
      `;
      
      console.log(`  💾 DB aggiornato per ${productId}.`);
      successCount++;
      
      // Delay per non sovraccaricare l'API (rispetto policy OFF)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (err) {
      console.error(`  ⚠️ Errore durante l'arricchimento di ${productId}:`, err);
      failCount++;
    }
  }

  console.log(`\nCompletato! Successi: ${successCount}, Fallimenti: ${failCount}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Errore fatale nello script:', err);
  process.exit(1);
});
