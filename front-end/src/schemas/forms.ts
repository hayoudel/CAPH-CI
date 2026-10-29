import { z } from 'zod';

const required = (label = 'Ce champ') => z.string().trim().min(1, `${label} est obligatoire.`);
const email = z.string().trim().min(1, 'L’adresse email est obligatoire.').email('Saisissez une adresse email valide (ex. nom@domaine.ci).');
const phone = (mandatory: boolean) =>
  z.string().trim().refine(v => (mandatory ? v.length > 0 : true), 'Le numéro de téléphone est obligatoire.')
    .refine(v => v === '' || v.replace(/[\s.\-()+]/g, '').length >= 8, 'Saisissez un numéro de téléphone valide (8 chiffres minimum).');

export const contactSchema = z.object({
  nom: required('Le nom'),
  organisation: z.string().trim().optional().default(''),
  telephone: phone(false),
  email,
  sujet: required('Le sujet'),
  message: required('Le message').pipe(z.string().min(10, 'Le message doit contenir au moins 10 caractères.')),
  privacy: z.literal(true, { errorMap: () => ({ message: 'Vous devez accepter le traitement de vos données pour envoyer le message.' }) }),
});
export type ContactValues = z.output<typeof contactSchema>;

export const partnershipSchema = z.object({
  organisation: required('L’organisation'),
  responsable: required('Le responsable'),
  fonction: required('La fonction'),
  telephone: phone(true),
  email,
  typeOrg: required('Le type d’organisation'),
  domaine: z.string().trim().optional().default(''),
  collaboration: required('Le type de collaboration'),
  message: required('Le message'),
});
export type PartnershipValues = z.infer<typeof partnershipSchema>;

export const quoteSchema = z.object({
  organisation: required('L’organisation'),
  contact: required('Le nom du contact'),
  email,
  service: required('Le service souhaité'),
  message: required('La description du besoin'),
});
export type QuoteValues = z.infer<typeof quoteSchema>;

/** Demande de soutien/don : AUCUNE donnée bancaire n'est modélisée ni transmise. */
export const donationSchema = z.object({
  type: z.enum(['ponctuel', 'regulier', 'projet', 'nature']),
  target: z.string().min(1),
  frequency: z.enum(['mensuel', 'trimestriel', 'annuel']).optional(),
  amount: z.number().int().positive('Le montant doit être supérieur à 0.').optional(),
  nom: required('Le nom'),
  email,
  telephone: phone(true),
  natureDescription: z.string().trim().optional(),
}).superRefine((v, ctx) => {
  if (v.type === 'nature' && !v.natureDescription) {
    ctx.addIssue({ code: 'custom', path: ['natureDescription'], message: 'Décrivez le bien, l’équipement ou le service proposé.' });
  }
});
export type DonationValues = z.infer<typeof donationSchema>;

export const fundingSchema = z.object({
  projectId: required('Le projet'),
  nom: required('Le nom'),
  email,
  telephone: phone(false),
  message: z.string().trim().optional().default(''),
});
export type FundingValues = z.infer<typeof fundingSchema>;

export const membershipSchema = z.object({
  natureDemande: z.enum(['premiere', 'renouvellement']),
  categorie: required('La catégorie de membre'),
  profilPhysique: z.string().optional().default(''),
  nomPersonne: z.string().optional().default(''),
  naissance: z.string().optional().default(''),
  profession: z.string().optional().default(''),
  typeHandicap: z.string().optional().default(''),
  amenagement: z.string().optional().default(''),
  delegation: z.string().optional().default(''),
  contribution: z.string().optional().default(''),
  nomOrg: z.string().optional().default(''),
  sigle: z.string().optional().default(''),
  dateCreation: z.string().optional().default(''),
  typeOrg: z.string().optional().default(''),
  domaine: z.string().optional().default(''),
  region: z.string().optional().default(''),
  zone: z.string().optional().default(''),
  recepisse: z.string().optional().default(''),
  secretaire: z.string().optional().default(''),
  tresorier: z.string().optional().default(''),
  commune: z.string().optional().default(''),
  adresse: z.string().optional().default(''),
  responsableNom: z.string().optional().default(''),
  fonction: z.string().optional().default(''),
  telephone: z.string().optional().default(''),
  email: z.string().trim().optional().default(''),
  presentation: z.string().optional().default(''),
  mission: z.string().optional().default(''),
  nbMembres: z.string().optional().default(''),
  motivations: z.string().optional().default(''),
  agreed: z.boolean(),
}).superRefine((v, ctx) => {
  if (!v.agreed) ctx.addIssue({ code: 'custom', path: ['agreed'], message: 'Vous devez accepter les conditions d’adhésion.' });
  const need = (k: keyof typeof v, msg: string) => {
    if (!String(v[k] ?? '').trim()) ctx.addIssue({ code: 'custom', path: [k], message: msg });
  };
  if (v.categorie === 'morale') {
    need('nomOrg', 'Le nom de l’organisation est obligatoire.');
    need('dateCreation', 'La date de création est obligatoire.');
    need('typeOrg', 'Le type d’organisation est obligatoire.');
    need('domaine', 'Le domaine d’intervention est obligatoire.');
    need('zone', 'La zone d’intervention est obligatoire.');
    need('recepisse', 'Le n° de récépissé ou la référence légale est obligatoire.');
    need('region', 'La région est obligatoire.');
    need('adresse', 'L’adresse du siège est obligatoire.');
    need('responsableNom', 'Le nom du responsable est obligatoire.');
    need('fonction', 'La fonction est obligatoire.');
    need('telephone', 'Le numéro de téléphone est obligatoire.');
    need('email', 'L’adresse email est obligatoire.');
    need('presentation', 'La présentation est obligatoire.');
    need('mission', 'La mission est obligatoire.');
    need('motivations', 'Les motivations sont obligatoires.');
  }
  if (v.categorie === 'physique' || v.categorie === 'honoraire') {
    need('nomPersonne', 'Le nom et prénom sont obligatoires.');
    need('telephone', 'Le numéro de téléphone est obligatoire.');
    need('adresse', 'L’adresse est obligatoire.');
  }
  if (v.categorie === 'physique') need('profilPhysique', 'Le profil du demandeur est obligatoire.');
  if (v.email && !z.string().email().safeParse(v.email).success) {
    ctx.addIssue({ code: 'custom', path: ['email'], message: 'Saisissez une adresse email valide.' });
  }
});
export type MembershipValues = z.infer<typeof membershipSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Le mot de passe est obligatoire.'),
});
export type LoginValues = z.infer<typeof loginSchema>;
