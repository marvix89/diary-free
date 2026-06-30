import { v2 as cloudinary } from 'cloudinary';

/**
 * Client Cloudinary configurato con le variabili d'ambiente.
 * Singleton: viene inizializzato una sola volta al primo import.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // usa sempre HTTPS
});

export default cloudinary;

/**
 * Costruisce l'URL CDN di Cloudinary per un'immagine prodotto.
 * Applica trasformazioni automatiche: formato ottimale (WebP su browser moderni)
 * e qualità automatica per ridurre il peso senza perdita percepibile.
 *
 * @param publicId — es. "diary-free/products/8051406012656"
 */
export function buildCloudinaryUrl(publicId?: string | null): string | undefined {
  if (!publicId || publicId === 'none' || publicId === 'not_available') return undefined;
  return cloudinary.url(publicId, {
    fetch_format: 'auto',  // WebP/AVIF automatico
    quality: 'auto',       // qualità ottimale automatica
    secure: true,
  });
}

/**
 * Restituisce il public_id standard per un prodotto dato il suo ID.
 * Formato: "diary-free/products/{productId}"
 */
export function getProductPublicId(productId: string): string {
  return `diary-free/products/${productId}`;
}
