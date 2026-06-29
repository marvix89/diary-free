export function getValidImageUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase().includes('openfoodfacts.org')) return null;
  return trimmed;
}
