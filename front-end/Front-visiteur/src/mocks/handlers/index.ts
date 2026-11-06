import { http, HttpResponse, delay } from 'msw';
import {
  agendaEvents, delegations, domains, mediaItems, newsItems, ophList, opportunities, projects, resources, stats,
} from '../data/fixtures';
import { flagProvisional } from '../data/provisional';
import {
  contactSchema, donationSchema, fundingSchema, loginSchema, membershipSchema, partnershipSchema, quoteSchema,
} from '../../schemas/forms';
import type { FormKind, FormReceipt, Paginated, PartnershipStatus, PartnershipStatusCode } from '../../types';

const BASE = '/api';
const LATENCY = import.meta.env.MODE === 'test' ? 0 : 250;

const data = {
  domains: flagProvisional(domains),
  projects: flagProvisional(projects),
  news: flagProvisional(newsItems),
  agenda: flagProvisional(agendaEvents),
  delegations: flagProvisional(delegations),
  opportunities: flagProvisional(opportunities),
  organizations: flagProvisional(ophList),
  media: flagProvisional(mediaItems),
  resources: flagProvisional(resources),
};

const notFound = (what: string) => HttpResponse.json({ message: `${what} introuvable.` }, { status: 404 });

function paginate<T extends object>(items: T[], url: URL, searchable: (keyof T)[] = []): Paginated<T> {
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') ?? 100)));
  const filtered = q
    ? items.filter(item => searchable.some(k => String(item[k] ?? '').toLowerCase().includes(q)))
    : items;
  const start = (page - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
  };
}

function list<T extends { id: string }>(path: string, items: T[]) {
  return [
    http.get(`${BASE}/${path}`, async () => { await delay(LATENCY); return HttpResponse.json(items); }),
    http.get(`${BASE}/${path}/:id`, async ({ params }) => {
      await delay(LATENCY);
      const item = items.find(i => i.id === params.id);
      return item ? HttpResponse.json(item) : notFound('Ressource');
    }),
  ];
}

/** Reçu de simulation : rien n'est lu, journalisé ni stocké. */
function receipt(kind: FormKind): FormReceipt {
  const prefix = { contact: 'CTC', membership: 'ADH', partnership: 'PAR', 'quote-request': 'DEV', 'funding-interest': 'FIN', 'donation-interest': 'DON' }[kind];
  return {
    simulated: true,
    reference: `CAPH-${prefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    receivedAt: new Date().toISOString(),
    message: 'Simulation — aucune donnée n’a été transmise ni conservée.',
  };
}

function formHandler(path: string, kind: FormKind, schema: { safeParse: (v: unknown) => { success: boolean; error?: { flatten: () => unknown } } }) {
  return http.post(`${BASE}/forms/${path}`, async ({ request }) => {
    await delay(LATENCY);
    const body = await request.json().catch(() => null);
    const result = schema.safeParse(body);
    if (!result.success) {
      return HttpResponse.json({ message: 'Les informations transmises sont invalides.', errors: result.error?.flatten() }, { status: 422 });
    }
    return HttpResponse.json(receipt(kind), { status: 201 });
  });
}
const STATUS_TEXT: Record<PartnershipStatusCode, { label: string; message: string }> = {
  recue: { label: 'Demande reçue', message: 'Votre demande a bien été enregistrée. Elle n’a pas encore été examinée.' },
  en_analyse: { label: 'En cours d’analyse', message: 'Votre demande est en cours d’analyse par l’équipe de la CAPH-CI.' },
  complement: { label: 'Complément demandé', message: 'Des informations complémentaires sont nécessaires. L’équipe vous contactera.' },
  traitee: { label: 'Demande traitée', message: 'Votre demande a été traitée. L’équipe de la CAPH-CI vous a répondu.' },
};

/** Statut FICTIF déduit du dernier chiffre de la référence (le mock ne stocke aucune demande). */
function simulatedStatus(reference: string): PartnershipStatus {
  const digit = Number(reference.slice(-1));
  const status: PartnershipStatusCode = digit <= 2 ? 'recue' : digit <= 5 ? 'en_analyse' : digit <= 7 ? 'complement' : 'traitee';
  return { reference, status, ...STATUS_TEXT[status], updatedAt: new Date().toISOString(), simulated: true };
}

export const handlers = [
  http.get(`${BASE}/settings`, async () => {
    await delay(LATENCY);
    return HttpResponse.json({
      name: 'CAPH-CI',
      tagline: 'Ensemble pour une Côte d’Ivoire inclusive',
      email: 'caphci2011@gmail.com',
      phones: ['07 08 24 95 30', '05 05 28 39 55', '01 42 09 96 96'],
      address: 'Abidjan, Abobo Sogefiha, non loin du Terrain des 4 Étages, APP 1400',
      hasPublicBankDetails: false,
    });
  }),
  http.get(`${BASE}/home`, async () => { await delay(LATENCY); return HttpResponse.json({ stats }); }),

  ...list('domains', data.domains),
  http.get(`${BASE}/projects`, async ({ request }) => {
    await delay(LATENCY);
    return HttpResponse.json(paginate(data.projects, new URL(request.url), ['title', 'description', 'region', 'domain']));
  }),
  http.get(`${BASE}/projects/:id`, async ({ params }) => {
    await delay(LATENCY);
    const item = data.projects.find(p => p.id === params.id);
    return item ? HttpResponse.json(item) : notFound('Projet');
  }),
  http.get(`${BASE}/news`, async ({ request }) => {
    await delay(LATENCY);
    return HttpResponse.json(paginate(data.news, new URL(request.url), ['title', 'summary', 'category']));
  }),
  http.get(`${BASE}/news/:id`, async ({ params }) => {
    await delay(LATENCY);
    const item = data.news.find(n => n.id === params.id);
    return item ? HttpResponse.json(item) : notFound('Actualité');
  }),
  ...list('agenda', data.agenda),
  ...list('delegations', data.delegations),
  ...list('opportunities', data.opportunities),
  ...list('organizations', data.organizations),
  http.get(`${BASE}/media`, async () => { await delay(LATENCY); return HttpResponse.json(data.media); }),
  ...list('resources', data.resources),
  // Aucun témoignage réel n'est disponible : la liste reste vide (jamais de témoignage inventé).
  http.get(`${BASE}/testimonials`, async () => { await delay(LATENCY); return HttpResponse.json([]); }),
http.get(`${BASE}/forms/partnership/status/:reference`, async ({ params }) => {
  await delay(LATENCY);
  const reference = String(params.reference).toUpperCase();
  if (!/^CAPH-PAR-\d{4}-\d{4}$/.test(reference)) {
    return HttpResponse.json({ message: 'Aucune demande ne correspond à cette référence.' }, { status: 404 });
  }
  return HttpResponse.json(simulatedStatus(reference));
}),

  formHandler('contact', 'contact', contactSchema),
  formHandler('membership', 'membership', membershipSchema),
  formHandler('partnership', 'partnership', partnershipSchema),
  formHandler('quote-request', 'quote-request', quoteSchema),
  formHandler('funding-interest', 'funding-interest', fundingSchema),
  formHandler('donation-interest', 'donation-interest', donationSchema),

  http.post(`${BASE}/auth/login`, async ({ request }) => {
    await delay(LATENCY);
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return HttpResponse.json({ message: 'Identifiants invalides.' }, { status: 422 });
    // Prototype : aucun compte réel. Session fictive, sans jeton ni donnée conservée.
    return HttpResponse.json({ authenticated: true, prototype: true, displayName: 'Membre (prototype)' });
  }),
  http.post(`${BASE}/auth/logout`, async () => { await delay(LATENCY); return HttpResponse.json({ ok: true }); }),
];
