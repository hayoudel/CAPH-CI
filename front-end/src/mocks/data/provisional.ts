export const PROVISIONAL_MARKER = 'Prototype — à valider';

/**
 * Marque `isProvisional: true` sur tout élément (et sous-élément média/document)
 * dont un texte porte le marqueur « Prototype — à valider ».
 * Ne transforme jamais une donnée fictive en donnée officielle.
 */
export function flagProvisional<T extends object>(items: T[]): (T & { isProvisional?: boolean })[] {
  return items.map(item => {
    const copy = { ...item } as Record<string, unknown>;
    for (const key of ['media', 'docs']) {
      const nested = copy[key];
      if (Array.isArray(nested)) copy[key] = flagProvisional(nested as object[]);
    }
    const provisional = Object.values(item as Record<string, unknown>).some(v => typeof v === 'string' && v.includes(PROVISIONAL_MARKER));
    return provisional ? { ...(copy as T), isProvisional: true } : (copy as T);
  });
}
