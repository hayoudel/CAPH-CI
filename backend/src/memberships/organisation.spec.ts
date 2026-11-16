/**
 * Définition des champs du formulaire « Organisation (personne morale) », d'après le bulletin.
 * Une seule définition sert à valider les brouillons (format) ET la soumission (complétude).
 */
export type FieldType = 'text' | 'email' | 'phone' | 'url' | 'uuid' | 'uuidList';
export interface FieldSpec { label: string; type: FieldType; required: boolean; max?: number }

export const ORGANISATION_FIELDS: Record<string, Record<string, FieldSpec>> = {
  organization: {
    name: { label: 'Dénomination', type: 'text', required: true, max: 200 },
    acronym: { label: 'Sigle', type: 'text', required: false, max: 30 },
    address: { label: 'Siège / adresse complète', type: 'text', required: true, max: 255 },
    regionId: { label: 'Région', type: 'uuid', required: true },
    commune: { label: 'Commune', type: 'text', required: true, max: 100 },
    interventionDomainIds: { label: "Domaine(s) d'intervention", type: 'uuidList', required: true },
    interventionZone: { label: "Zone d'intervention", type: 'text', required: true, max: 255 },
    disabilityTypeIds: { label: 'Types de handicap concernés', type: 'uuidList', required: false },
    legalReference: { label: 'N° de récépissé / référence légale', type: 'text', required: true, max: 120 },
    phone: { label: 'Téléphone', type: 'phone', required: true },
    email: { label: 'E-mail', type: 'email', required: true },
    website: { label: 'Site web', type: 'url', required: false, max: 255 },
  },
  representative: {
    name: { label: 'Nom du représentant habilité', type: 'text', required: true, max: 150 },
    function: { label: 'Fonction du représentant', type: 'text', required: true, max: 120 },
    phone: { label: 'Téléphone du représentant', type: 'phone', required: true },
    email: { label: 'E-mail du représentant', type: 'email', required: true },
  },
  secretaryGeneral: {
    name: { label: 'Nom du secrétaire général', type: 'text', required: true, max: 150 },
    contact: { label: 'Contact du secrétaire général', type: 'text', required: true, max: 150 },
  },
  treasurer: {
    name: { label: 'Nom du trésorier / responsable financier', type: 'text', required: true, max: 150 },
    contact: { label: 'Contact du trésorier / responsable financier', type: 'text', required: true, max: 150 },
  },
};

const PHONE = /^[+0-9 ().-]{6,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface FieldError { field: string; message: string }

function checkValue(spec: FieldSpec, v: unknown): string | null {
  if (spec.type === 'uuidList') {
    return Array.isArray(v) && v.length <= 30 && v.every((x) => typeof x === 'string' && UUID.test(x)) ? null : `${spec.label} : valeur invalide.`;
  }
  if (typeof v !== 'string') return `${spec.label} : valeur invalide.`;
  const s = v.trim();
  if (!s) return null; // vide = non renseigné (contrôlé à la soumission)
  if (spec.max && s.length > spec.max) return `${spec.label} : ${spec.max} caractères maximum.`;
  if (spec.type === 'email' && !EMAIL.test(s)) return `${spec.label} : adresse e-mail invalide.`;
  if (spec.type === 'phone' && !PHONE.test(s)) return `${spec.label} : numéro de téléphone invalide.`;
  if (spec.type === 'uuid' && !UUID.test(s)) return `${spec.label} : valeur invalide.`;
  if (spec.type === 'url' && !/^https?:\/\/\S+\.\S+$/i.test(s)) return `${spec.label} : adresse invalide (commencez par https://).`;
  return null;
}

/** Nettoie et valide les données envoyées (champs inconnus refusés). Retourne les données propres + erreurs de format. */
export function sanitizeOrganisationData(input: unknown): { data: Record<string, Record<string, unknown>>; errors: FieldError[] } {
  const errors: FieldError[] = [];
  const data: Record<string, Record<string, unknown>> = {};
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { data, errors: [{ field: 'data', message: 'Format invalide.' }] };
  }
  for (const [section, fields] of Object.entries(input as Record<string, unknown>)) {
    const specs = ORGANISATION_FIELDS[section];
    if (!specs || typeof fields !== 'object' || fields === null || Array.isArray(fields)) {
      errors.push({ field: section, message: 'Section inconnue.' });
      continue;
    }
    data[section] = {};
    for (const [key, value] of Object.entries(fields as Record<string, unknown>)) {
      const spec = specs[key];
      if (!spec) { errors.push({ field: `${section}.${key}`, message: 'Champ inconnu.' }); continue; }
      const err = checkValue(spec, value);
      if (err) errors.push({ field: `${section}.${key}`, message: err });
      else data[section][key] = typeof value === 'string' ? value.trim() : value;
    }
  }
  return { data, errors };
}

/** Champs obligatoires manquants. */
export function missingOrganisationFields(data: Record<string, any>): FieldError[] {
  const missing: FieldError[] = [];
  for (const [section, specs] of Object.entries(ORGANISATION_FIELDS)) {
    for (const [key, spec] of Object.entries(specs)) {
      if (!spec.required) continue;
      const v = data?.[section]?.[key];
      const empty = v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0);
      if (empty) missing.push({ field: `${section}.${key}`, message: `${spec.label} : champ obligatoire.` });
    }
  }
  return missing;
}
