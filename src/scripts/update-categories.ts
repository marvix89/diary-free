import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

function getDynamicCategoryStyle(slug: string): { emoji: string; color: string } {
  if (/carn|salum|prosciutt|mortadell|speck|wrustel|pollo|bovino|maiale/.test(slug)) return { emoji: '🥩', color: '#dc2626' };
  if (/pesc|tonn|salmon|merluzz|crostace|mollusc|gamber/.test(slug)) return { emoji: '🐟', color: '#0284c7' };
  if (/past|spaghett|maccheron|tortellin|raviol|gnocch|riso|cereali/.test(slug)) return { emoji: '🍝', color: '#ca8a04' };
  if (/pan|lievitat|focacc|grissin|cracker|piadin|panin|fette/.test(slug)) return { emoji: '🍞', color: '#d97706' };
  if (/verd|ortagg|insalat|pomodor|patat|legum|fagiol|lenticch|ceci/.test(slug)) return { emoji: '🥗', color: '#16a34a' };
  if (/frutt|mel|banan|agrum|succ|marmellat|confettur/.test(slug)) return { emoji: '🍎', color: '#ea580c' };
  if (/olio|condiment|sals|maiones|ket|senap|dad|spezie|brodo/.test(slug)) return { emoji: '🫒', color: '#65a30d' };
  if (/snack|patatin|popcorn|salat/.test(slug)) return { emoji: '🥨', color: '#b45309' };
  if (/bevand|acq|bibit|tè|caffè|infus|birr|vino/.test(slug)) return { emoji: '🥤', color: '#0891b2' };
  return { emoji: '🏷️', color: '#6366f1' };
}

function categorizeProduct(p: any): { id: string; label: string; emoji: string; color: string } {
  const tags = (p.categories_tags || []).join(' ').toLowerCase();
  const name = [p.product_name_it, p.product_name, p.name_enc].filter(Boolean).join(' ').toLowerCase();

  // 1. Controlla prima i tag gerarchici ufficiali di OFF
  if (tags.includes('plant-milks') || tags.includes('plant-based-beverages') || tags.includes('milk-substitutes')) {
    return { id: 'alternative-vegetali', label: 'Alternative Vegetali', emoji: '🥛', color: '#7c3aed' };
  }
  if (tags.includes('cheeses') || tags.includes('cream-cheeses') || tags.includes('plant-cheeses')) {
    return { id: 'formaggi', label: 'Formaggi & Spalmabili', emoji: '🧀', color: '#d97706' };
  }
  if (tags.includes('yogurts') || tags.includes('plant-yogurts') || tags.includes('fermented-milk')) {
    return { id: 'yogurt-dessert', label: 'Yogurt & Dessert', emoji: '🫙', color: '#16a34a' };
  }
  if (tags.includes('ice-creams') || tags.includes('sorbets')) {
    return { id: 'gelati', label: 'Gelati', emoji: '🍦', color: '#0891b2' };
  }
  if (tags.includes('biscuits') || tags.includes('cookies') || tags.includes('cakes') || tags.includes('pastries') || tags.includes('sweet-snacks')) {
    return { id: 'dolci-biscotti', label: 'Dolci & Biscotti', emoji: '🍪', color: '#be185d' };
  }

  // 2. Controlla il nome del prodotto (senza guardare l'intera lista ingredienti)
  if (/gelato|ice cream|sorbetto|cremeria|magnum|cucciolone|stecco|tartufo|granita|cono/.test(name)) {
    return { id: 'gelati', label: 'Gelati', emoji: '🍦', color: '#0891b2' };
  }
  if (/yogurt|kefir|bifidus|budino|dessert|zymil|fermentato|pudding/.test(name)) {
    return { id: 'yogurt-dessert', label: 'Yogurt & Dessert', emoji: '🫙', color: '#16a34a' };
  }
  if (/formaggio|cheese|mozzarella|burro|butter|ricotta|stracchino|crescenza|robiola|spalmabile|sottilette|grattugiato|mascarpone|provola|scamorza|gorgonzola|fiocchi di latte|fettine|fuso|violife|vemondo/.test(name)) {
    return { id: 'formaggi', label: 'Formaggi & Spalmabili', emoji: '🧀', color: '#d97706' };
  }
  if (/bevanda.*soia|bevanda.*riso|bevanda.*avena|bevanda.*mandorla|bevanda.*cocco|latte.*soia|latte.*riso|latte.*avena|latte.*mandorla|latte.*cocco|soya|soia drink|oat drink|almond drink|rice drink|panna vegetale|cuisine|alpro|valsoia|hipro|accadì/.test(name)) {
    return { id: 'alternative-vegetali', label: 'Alternative Vegetali', emoji: '🥛', color: '#7c3aed' };
  }
  if (/biscott|frollin|cookie|biscuit|wafer|cake|torta|crostata|muffin|madeleine|cornett|brioche|merenda|cioccolat|cacao/.test(name)) {
    return { id: 'dolci-biscotti', label: 'Dolci & Biscotti', emoji: '🍪', color: '#be185d' };
  }
  if (/burger|pizza|lasagna|ravioli|tortellini|zuppa|soup|cotoletta|nugget|piatto pronto|meal/.test(name)) {
    return { id: 'piatti-pronti', label: 'Piatti Pronti', emoji: '🍳', color: '#b45309' };
  }

  // 3. Se non corrisponde alle 6 categorie base, crea una categoria dinamica dalle categorie OFF o dal nome
  if (p.categories) {
    const parts = p.categories.split(',').map((s: string) => s.trim()).filter(Boolean);
    const genericWords = ['plant-based', 'alimenti', 'cibi', 'beverages', 'foods', 'prodotti', 'en:'];
    const candidate = parts.find((part: string) => part.length <= 30 && !genericWords.some(w => part.toLowerCase().includes(w))) || parts[0];
    
    if (candidate) {
      const id = candidate.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (id && id.length > 1) {
        const label = candidate.charAt(0).toUpperCase() + candidate.slice(1);
        const style = getDynamicCategoryStyle(id);
        return { id, label, emoji: style.emoji, color: style.color };
      }
    }
  }

  // Ultimo tentativo dal nome
  if (/prosciutt|salum|mortadell|pancett|speck|wrustel|carn|bresaol/.test(name)) {
    return { id: 'salumi-carni', label: 'Salumi & Carni', emoji: '🥩', color: '#dc2626' };
  }
  if (/pan|fette|grissin|cracker|piadin/.test(name)) {
    return { id: 'pane-lievitati', label: 'Pane & Lievitati', emoji: '🍞', color: '#d97706' };
  }
  if (/past|spaghett|penn|fusill|maccheron/.test(name)) {
    return { id: 'pasta-cereali', label: 'Pasta & Cereali', emoji: '🍝', color: '#ca8a04' };
  }
  if (/dad|brod|spezi|sals|condiment|olio/.test(name)) {
    return { id: 'condimenti-salse', label: 'Condimenti & Salse', emoji: '🫒', color: '#65a30d' };
  }
  if (/acq|bibit|succ|thè|tè|infus|caffè/.test(name)) {
    return { id: 'bevande', label: 'Bevande', emoji: '🥤', color: '#0891b2' };
  }

  return { id: 'personalizzato', label: 'Personalizzato', emoji: '⭐', color: '#f59e0b' };
}

async function main() {
  console.log('Inizio aggiornamento accurato categorie del DB...');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERRORE: DATABASE_URL non impostato.');
    process.exit(1);
  }

  const sql = neon(dbUrl);

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

  const products = await sql`SELECT * FROM products`;
  console.log(`Trovati ${products.length} prodotti nel database.`);

  let updatedCount = 0;

  for (const row of products) {
    let offData: any = {};
    if (/^\d{8,14}$/.test(row.id)) {
      try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${row.id}.json?fields=categories,categories_tags,labels_tags,product_name_it,product_name`);
        if (res.ok) {
          const json = await res.json();
          if (json.status === 1 && json.product) {
            offData = json.product;
          }
        }
      } catch {
        // Ignora
      }
    }

    const mergedData = {
      ...row,
      ...offData
    };

    const catInfo = categorizeProduct(mergedData);

    await sql`
      INSERT INTO categories (id, label, emoji, color)
      VALUES (${catInfo.id}, ${catInfo.label}, ${catInfo.emoji}, ${catInfo.color})
      ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        emoji = EXCLUDED.emoji,
        color = EXCLUDED.color
    `;

    await sql`
      UPDATE products
      SET category = ${catInfo.id}, emoji = ${catInfo.emoji}
      WHERE id = ${row.id}
    `;

    console.log(`[${row.id}] "${row.name_enc}" -> Categoria: "${catInfo.label}" (${catInfo.id})`);
    updatedCount++;
  }

  console.log(`\nAggiornamento completato su ${updatedCount} prodotti!`);
  process.exit(0);
}

main().catch(err => {
  console.error('Errore fatale nello script:', err);
  process.exit(1);
});
