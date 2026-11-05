/**
 * Données de DÉMONSTRATION de l'espace OPH — séparées du seed de production.
 *
 *   npm run seed:demo          crée (ou recrée) les contenus de démonstration
 *   npm run seed:demo:clear    supprime uniquement ces contenus
 *
 * - Chaque contenu créé ici porte isDemo = true : l'interface affiche « Données de démonstration »
 *   et seuls ces contenus sont supprimés/recréés (vos vraies données ne sont jamais touchées).
 * - Organisations, personnes, projets, événements : tout est fictif (adresses en « .example »).
 * - Refuse de s'exécuter si NODE_ENV=production.
 * - Prérequis : le seed de base avec SEED_DEMO=true (région, délégations, association Horizon Inclusif).
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { basename, join } from 'path';
import { PrismaClient, type ContentReviewStatus, type EventMode, type EventStatus, type EventType, type NewsStatus, type OpportunityStatus, type OpportunityType, type ProjectStatus, type ReportStatus, type ReportType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import type { ConfigService } from '@nestjs/config';
import { hashPassword } from '../src/common/utils/password';
import { StorageService } from '../src/storage/storage.service';

if (process.env.NODE_ENV === 'production') {
  console.error('✖ Les données de démonstration ne doivent jamais être créées en production.');
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const storage = new StorageService({ get: (k: string) => process.env[k] } as unknown as ConfigService);
const PASSWORD = 'Demo-Passw0rd!2026';
const ASSETS = join(__dirname, 'demo-assets');
const NOTE = '\n\n— Contenu de démonstration : exemple fictif, sans valeur officielle.';
const day = (n: number, hour = 9) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(hour, 0, 0, 0); return d; };

// ───────────────────────────── Nettoyage ─────────────────────────────
async function clearDemo() {
  const fileIds = new Set<string>();
  const add = (ids: (string | null)[]) => ids.forEach((i) => i && fileIds.add(i));
  add((await prisma.newsProposal.findMany({ where: { isDemo: true }, select: { coverFileId: true } })).map((x) => x.coverFileId));
  add((await prisma.project.findMany({ where: { isDemo: true }, select: { coverFileId: true } })).map((x) => x.coverFileId));
  add((await prisma.reportAttachment.findMany({ where: { report: { isDemo: true } }, select: { fileId: true } })).map((x) => x.fileId));
  add((await prisma.newsAttachment.findMany({ where: { proposal: { isDemo: true } }, select: { fileId: true } })).map((x) => x.fileId));
  add((await prisma.projectAttachment.findMany({ where: { project: { isDemo: true } }, select: { fileId: true } })).map((x) => x.fileId));
  await prisma.report.deleteMany({ where: { isDemo: true } });
  await prisma.newsProposal.deleteMany({ where: { isDemo: true } });
  await prisma.project.deleteMany({ where: { isDemo: true } });
  await prisma.opportunity.deleteMany({ where: { isDemo: true } });
  await prisma.event.deleteMany({ where: { isDemo: true } });
  await prisma.communication.deleteMany({ where: { isDemo: true } });
  const assets = await prisma.fileAsset.findMany({ where: { id: { in: [...fileIds] } }, select: { id: true, storageKey: true } });
  for (const a of assets) await storage.remove(a.storageKey).catch(() => undefined);
  await prisma.fileAsset.deleteMany({ where: { id: { in: assets.map((a) => a.id) } } });
  console.log('✔ Contenus de démonstration supprimés');
}

// ───────────────────────────── Aides ─────────────────────────────
async function storeFile(name: string, mime: string, uploadedById: string) {
  const buf = readFileSync(join(ASSETS, name));
  const saved = await storage.save(buf, false);
  const asset = await prisma.fileAsset.create({
    data: { storageKey: saved.storageKey, originalName: basename(name), mimeType: mime, sizeBytes: buf.length, sha256: saved.sha256, encrypted: saved.encrypted, uploadedById },
  });
  return asset.id;
}

async function ensureUser(email: string, firstName: string, lastName: string, jobTitle: string) {
  return prisma.user.upsert({
    where: { email }, update: {},
    create: { email, firstName, lastName, jobTitle, passwordHash: await hashPassword(PASSWORD), status: 'ACTIVE', passwordChangedAt: new Date() },
  });
}
async function ensureMember(userId: string, organizationId: string, roleCode: string) {
  const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
  await prisma.organizationMember.upsert({ where: { userId }, update: {}, create: { userId, organizationId, roleId: role.id } });
}

interface OrgSpec { key: string; name: string; acronym: string; no: string; region: string; commune: string; domain: string; disability: string; email: string; president: [string, string, string, string] }
const ORGS: OrgSpec[] = [
  { key: 'poro', name: 'Association Lumière du Poro', acronym: 'ALP', no: 'DEMO-0002', region: 'PRO', commune: 'Korhogo', domain: 'EDUCATION', disability: 'VISUAL', email: 'contact@lumiere-poro.example', president: ['souleymane.coulibaly@lumiere-poro.example', 'Souleymane', 'Coulibaly', 'Président'] },
  { key: 'gbeke', name: 'Collectif Entraide du Gbêkê', acronym: 'CEG', no: 'DEMO-0003', region: 'GBE', commune: 'Bouaké', domain: 'EMPLOI', disability: 'MOTOR', email: 'contact@entraide-gbeke.example', president: ['aminata.ouattara@entraide-gbeke.example', 'Aminata', 'Ouattara', 'Présidente'] },
  { key: 'man', name: 'Association Mains Unies de Man', acronym: 'AMUM', no: 'DEMO-0004', region: 'TON', commune: 'Man', domain: 'SANTE', disability: 'HEARING', email: 'contact@mains-unies-man.example', president: ['jb.gnahore@mains-unies-man.example', 'Jean-Baptiste', 'Gnahoré', 'Président'] },
];
type Actor = { orgId: string; userId: string; name: string };

async function ensureOrgs(): Promise<Record<string, Actor>> {
  const out: Record<string, Actor> = {};
  const horizon = await prisma.organization.findUnique({ where: { name: 'Association Horizon Inclusif' } });
  const awa = await prisma.user.findUnique({ where: { email: 'awa.kone@horizon-inclusif.example' } });
  if (!horizon || !awa) throw new Error('Association Horizon Inclusif introuvable : lancez d’abord le seed de base avec SEED_DEMO=true (npx prisma db seed).');
  out.horizon = { orgId: horizon.id, userId: awa.id, name: horizon.name };
  const deputy = await ensureUser('mariam.traore@horizon-inclusif.example', 'Mariam', 'Traoré', 'Vice-présidente');
  await ensureMember(deputy.id, horizon.id, 'OPH_DEPUTY');
  for (const o of ORGS) {
    const region = await prisma.region.findUniqueOrThrow({ where: { code: o.region } });
    const delegation = await prisma.delegation.findFirstOrThrow({ where: { regionId: region.id } });
    const domain = await prisma.interventionDomain.findUniqueOrThrow({ where: { code: o.domain } });
    const dis = await prisma.disabilityType.findUniqueOrThrow({ where: { code: o.disability } });
    const org = await prisma.organization.upsert({
      where: { name: o.name }, update: {},
      create: {
        name: o.name, acronym: o.acronym, status: 'ACTIVE', memberNumber: o.no, registeredAt: new Date(), delegationId: delegation.id, regionId: region.id,
        commune: o.commune, email: o.email, publicEmail: o.email, isListed: true, publicationConsentAt: new Date(),
        fieldVisibility: { publicEmail: true, publicPhone: false, postalAddress: false, website: false },
        domains: { connect: [{ id: domain.id }] }, disabilityTypes: { connect: [{ id: dis.id }] },
      },
    });
    const [email, first, last, job] = o.president;
    const u = await ensureUser(email, first, last, job);
    await ensureMember(u.id, org.id, 'OPH_PRESIDENT');
    out[o.key] = { orgId: org.id, userId: u.id, name: org.name };
  }
  return out;
}

// ───────────────────────────── Contenus ─────────────────────────────
async function seedCommunications(staffId: string) {
  const rows = [
    ['Bienvenue sur l’espace OPH', 'Information', 'Cet espace vous permet de suivre vos projets, proposer des actualités, transmettre vos rapports et consulter l’agenda et les opportunités de la CAPH-CI.', -12],
    ['Rappel : transmission des rapports d’activités', 'Rappel', 'Les organisations sont invitées à transmettre leur rapport d’activités annuel depuis l’onglet « Rapports » avant la fin du mois.', -4],
    ['Nouvelle session de formation en gestion associative', 'Formation', 'Une session de formation en comptabilité et gestion associative est ouverte aux membres. Consultez l’agenda pour la date et le lieu.', -1],
  ] as const;
  for (const [title, category, body, d] of rows) {
    await prisma.communication.create({ data: { isDemo: true, kind: 'INTERNAL', category, title, body: body + NOTE, publishedAt: day(d, 10), createdById: staffId, audienceAll: true } });
  }
}

interface OppSpec { ref: string; title: string; summary: string; body: string; type: OpportunityType; status: OpportunityStatus; deadline: number | null; audience: string; modality: string; org?: string }
const OPPS: OppSpec[] = [
  { ref: 'DEMO-OP-01', title: 'Appel à projets « Inclusion par le numérique »', summary: 'Financement de projets d’initiation au numérique pour les personnes en situation de handicap.', body: 'Les organisations de personnes handicapées peuvent déposer un projet de formation ou d’accès aux outils numériques. Budget maximal par projet : 5 000 000 F CFA.', type: 'CALL_FOR_PROJECTS', status: 'OPEN', deadline: 45, audience: 'OPH membres', modality: 'Dépôt du dossier en ligne' },
  { ref: 'DEMO-OP-02', title: 'Appel à candidatures — Programme d’accompagnement des jeunes entrepreneurs', summary: 'Accompagnement de 15 jeunes porteurs de projets en situation de handicap pendant six mois.', body: 'Le programme comprend un coaching individuel, une formation à la gestion et une mise en relation avec des financeurs.', type: 'OTHER', status: 'OPEN', deadline: 30, audience: 'Jeunes de 18 à 35 ans', modality: 'Candidature par courriel' },
  { ref: 'DEMO-OP-03', title: 'Formation en comptabilité associative', summary: 'Trois jours de formation pour les trésoriers et responsables administratifs des OPH.', body: 'Au programme : tenue des comptes, budget prévisionnel, rapport financier annuel. Places limitées à 25 participants.', type: 'TRAINING', status: 'OPEN', deadline: 20, audience: 'Trésoriers et gestionnaires', modality: 'Inscription auprès de la CAPH-CI' },
  { ref: 'DEMO-OP-04', title: 'Subvention de soutien aux activités locales', summary: 'Soutien financier aux petites actions de proximité menées par les OPH en région.', body: 'Une subvention de 500 000 à 1 500 000 F CFA peut être accordée pour une action de sensibilisation ou d’entraide locale.', type: 'GRANT', status: 'OPEN', deadline: 60, audience: 'OPH des régions', modality: 'Formulaire à télécharger puis dépôt au secrétariat', org: 'poro' },
  { ref: 'DEMO-OP-05', title: 'Stage d’appui à la communication', summary: 'Un stage de six mois pour appuyer la communication d’une OPH.', body: 'Le ou la stagiaire aide à la rédaction d’actualités, à la gestion des réseaux sociaux et à la préparation d’événements.', type: 'INTERNSHIP', status: 'OPEN', deadline: 25, audience: 'Étudiants en communication', modality: 'CV et lettre de motivation', org: 'horizon' },
  { ref: 'DEMO-OP-06', title: 'Rencontre professionnelle : emploi et handicap', summary: 'Une journée de rencontres entre employeurs, OPH et demandeurs d’emploi.', body: 'Stands, entretiens rapides et ateliers sur l’aménagement des postes de travail.', type: 'OTHER', status: 'OPEN', deadline: 40, audience: 'Employeurs, OPH, demandeurs d’emploi', modality: 'Inscription en ligne' },
  { ref: 'DEMO-OP-07', title: 'Consultation sur l’accessibilité des services publics', summary: 'Recueil des avis des OPH sur l’accessibilité des services publics de proximité.', body: 'Les contributions écrites des organisations serviront à préparer des recommandations collectives.', type: 'CONSULTATION', status: 'OPEN', deadline: 14, audience: 'Toutes les OPH', modality: 'Contribution écrite (2 pages maximum)' },
  { ref: 'DEMO-OP-08', title: 'Appel à projets « Écoles accessibles » (clôturé)', summary: 'Premier appel à projets pour l’accessibilité des écoles primaires — clôturé.', body: 'Cet appel est terminé ; il est conservé pour consultation de l’historique.', type: 'CALL_FOR_PROJECTS', status: 'CLOSED', deadline: -30, audience: 'OPH membres', modality: 'Dépôt du dossier en ligne' },
];
async function seedOpportunities(A: Record<string, Actor>, staffId: string) {
  for (const o of OPPS) {
    await prisma.opportunity.create({
      data: {
        isDemo: true, reference: o.ref, title: o.title, summary: o.summary, body: o.body + NOTE, type: o.type, status: o.status,
        deadline: o.deadline === null ? null : day(o.deadline, 17), audience: o.audience, modality: o.modality, visibility: 'MEMBERS',
        organizationId: o.org ? A[o.org].orgId : null, reviewStatus: 'APPROVED' as ContentReviewStatus, reviewedAt: day(-20), reviewedById: staffId, createdById: o.org ? A[o.org].userId : staffId,
      },
    });
  }
}

interface EvSpec { type: EventType; title: string; description: string; start: number; hour: number; hours: number; mode: EventMode; location: string; status: EventStatus; org?: string; region?: string }
const EVENTS: EvSpec[] = [
  { type: 'TRAINING', title: 'Atelier : rédiger une demande de financement', description: 'Atelier pratique pour apprendre à construire un budget et argumenter un dossier.', start: 6, hour: 9, hours: 4, mode: 'ONSITE', location: 'Siège de la CAPH-CI, Abidjan', status: 'REGISTRATION', region: 'ABJ' },
  { type: 'TRAINING', title: 'Formation en comptabilité associative', description: 'Trois jours de formation pour les trésoriers des OPH.', start: 21, hour: 8, hours: 8, mode: 'HYBRID', location: 'Bouaké et en ligne', status: 'OPEN', org: 'gbeke', region: 'GBE' },
  { type: 'MEETING', title: 'Réunion des présidents d’OPH', description: 'Point trimestriel : projets en cours, rapports et calendrier.', start: 12, hour: 10, hours: 3, mode: 'ONLINE', location: 'Visioconférence (lien envoyé aux inscrits)', status: 'OPEN' },
  { type: 'CONFERENCE', title: 'Conférence : l’emploi des personnes handicapées', description: 'Échanges entre employeurs, OPH et institutions sur l’accès à l’emploi.', start: 35, hour: 9, hours: 6, mode: 'ONSITE', location: 'Palais de la culture, Abidjan', status: 'PLANNED', region: 'ABJ' },
  { type: 'CAMPAIGN', title: 'Journée de sensibilisation à l’inclusion dans les écoles', description: 'Activités de sensibilisation menées avec des élèves et leurs enseignants.', start: 16, hour: 8, hours: 5, mode: 'ONSITE', location: 'Écoles de Korhogo', status: 'OPEN', org: 'poro', region: 'PRO' },
  { type: 'GENERAL_ASSEMBLY', title: 'Assemblée générale annuelle', description: 'Bilan de l’année, rapport financier et orientations.', start: 55, hour: 9, hours: 7, mode: 'ONSITE', location: 'Yamoussoukro', status: 'PLANNED' },
  { type: 'FORUM', title: 'Forum des initiatives locales', description: 'Les OPH présentent leurs actions et échangent sur leurs bonnes pratiques.', start: -20, hour: 9, hours: 8, mode: 'ONSITE', location: 'Man', status: 'CLOSED', org: 'man', region: 'TON' },
  { type: 'MEETING', title: 'Atelier de lancement du projet « Inclusion par le numérique »', description: 'Lancement officiel de la première phase du projet avec les bénéficiaires.', start: -45, hour: 10, hours: 3, mode: 'ONSITE', location: 'Yopougon, Abidjan', status: 'CLOSED', org: 'horizon', region: 'ABJ' },
];
async function seedEvents(A: Record<string, Actor>, staffId: string) {
  for (const e of EVENTS) {
    const region = e.region ? await prisma.region.findUnique({ where: { code: e.region } }) : null;
    const startsAt = day(e.start, e.hour);
    await prisma.event.create({
      data: {
        isDemo: true, type: e.type, title: e.title, description: e.description + NOTE, startsAt, endsAt: new Date(startsAt.getTime() + e.hours * 3_600_000), mode: e.mode,
        location: e.location, status: e.status, regionId: region?.id, organizationId: e.org ? A[e.org].orgId : null, reviewStatus: 'APPROVED', reviewedAt: day(-25), reviewedById: staffId,
        createdById: e.org ? A[e.org].userId : staffId,
      },
    });
  }
}

type Step = [NewsStatus | ProjectStatus, number, string?]; // statut, il y a N jours, observation
interface NewsSpec { title: string; summary: string; content: string; cat: string; org: string; date: number; status: NewsStatus; steps: Step[]; note?: string }
const NEWS: NewsSpec[] = [
  { title: 'Une journée de sensibilisation à l’inclusion réunit 300 élèves à Korhogo', summary: 'Jeux, témoignages et ateliers ont permis aux élèves de mieux comprendre le quotidien des personnes handicapées.', content: 'L’Association Lumière du Poro a organisé une journée de sensibilisation dans trois écoles de Korhogo. Les élèves ont participé à des jeux en classe, écouté des témoignages et essayé des outils d’accessibilité. Les enseignants ont reçu un guide pour poursuivre ces activités tout au long de l’année.', cat: 'ACTIVITIES', org: 'poro', date: -18, status: 'PUBLISHED', steps: [['SUBMITTED', 26], ['IN_REVIEW', 24], ['APPROVED', 22, 'Merci, contenu validé.'], ['PUBLISHED', 21]] },
  { title: 'Les présidents d’OPH se retrouvent pour échanger sur leurs projets', summary: 'Une rencontre pour partager les expériences et préparer les actions de l’année.', content: 'Une vingtaine de présidents d’organisations se sont réunis pour présenter leurs projets en cours, discuter des difficultés rencontrées et planifier des actions communes. Plusieurs idées de partenariats entre régions sont nées de cette rencontre.', cat: 'EVENTS', org: 'horizon', date: -25, status: 'PUBLISHED', steps: [['SUBMITTED', 33], ['IN_REVIEW', 31], ['APPROVED', 29], ['PUBLISHED', 28]] },
  { title: 'Formation des membres : mieux gérer les finances de son association', summary: 'Vingt-cinq trésoriers ont suivi une formation pratique en comptabilité associative.', content: 'Pendant trois jours, les participants ont appris à tenir un cahier de comptes, préparer un budget et rédiger un rapport financier clair. Chaque organisation est repartie avec un modèle de budget prêt à l’emploi.', cat: 'ACTIVITIES', org: 'gbeke', date: -30, status: 'PUBLISHED', steps: [['SUBMITTED', 36], ['APPROVED', 34], ['PUBLISHED', 33]] },
  { title: 'Un atelier numérique pour les jeunes de Yopougon', summary: 'Le projet « Inclusion par le numérique » a lancé ses premiers ateliers.', content: 'Soixante jeunes en situation de handicap découvrent l’ordinateur et le téléphone grâce à des ateliers animés par des bénévoles. Les séances se déroulent deux fois par semaine dans une salle accessible.', cat: 'ACTIVITIES', org: 'horizon', date: -10, status: 'PUBLISHED', steps: [['SUBMITTED', 15], ['IN_REVIEW', 14], ['APPROVED', 12], ['PUBLISHED', 11]] },
  { title: 'Participation de l’AMUM au forum des initiatives locales de Man', summary: 'L’association a présenté son programme d’interprétation en langue des signes.', content: 'Lors du forum, l’Association Mains Unies de Man a présenté son programme d’initiation à la langue des signes pour les familles et les agents de santé. Les échanges ont permis de nouer des contacts avec trois autres organisations.', cat: 'EVENTS', org: 'man', date: -19, status: 'PUBLISHED', steps: [['SUBMITTED', 22], ['APPROVED', 20], ['PUBLISHED', 19]] },
  { title: 'Tournoi sportif inclusif de Bouaké : appel aux équipes', summary: 'Le collectif prépare un tournoi ouvert à tous les types de handicap.', content: 'Le Collectif Entraide du Gbêkê organise un tournoi de sport adapté. Les équipes peuvent s’inscrire jusqu’à la fin du mois. Des bénévoles sont également recherchés pour l’accueil et l’arbitrage.', cat: 'EVENTS', org: 'gbeke', date: 25, status: 'IN_REVIEW', steps: [['SUBMITTED', 3], ['IN_REVIEW', 1]] },
  { title: 'Un guide pratique pour recevoir des personnes malvoyantes', summary: 'Conseils simples pour accueillir et guider une personne malvoyante.', content: 'L’Association Lumière du Poro a rédigé un petit guide : se présenter, décrire l’environnement, proposer son bras. Le guide est disponible auprès de l’association.', cat: 'RESOURCES', org: 'poro', date: -3, status: 'CORRECTION', steps: [['SUBMITTED', 6], ['IN_REVIEW', 5], ['CORRECTION', 2, 'Merci d’indiquer où se procurer le guide et un contact.']], note: 'Merci d’indiquer où se procurer le guide et un contact.' },
  { title: 'Retour sur les ateliers d’emploi de l’année', summary: 'Premier bilan des ateliers « CV et entretien » menés avec les jeunes.', content: 'Brouillon en cours de rédaction : bilan chiffré à compléter avec les résultats de fin d’année.', cat: 'ACTIVITIES', org: 'horizon', date: -1, status: 'DRAFT', steps: [] },
];
async function seedNews(A: Record<string, Actor>, staffId: string) {
  for (const n of NEWS) {
    const a = A[n.org];
    const cat = await prisma.newsCategory.findUniqueOrThrow({ where: { code: n.cat } });
    const last = n.steps.at(-1);
    const decided = n.status === 'PUBLISHED' || n.status === 'APPROVED' || n.status === 'CORRECTION' || n.status === 'REJECTED';
    const p = await prisma.newsProposal.create({
      data: {
        isDemo: true, organizationId: a.orgId, authorId: a.userId, categoryId: cat.id, title: n.title, summary: n.summary, description: n.content + NOTE, newsDate: day(n.date),
        status: n.status, reviewerNote: n.note ?? null, reviewedById: decided ? staffId : null,
        createdAt: day(-(n.steps[0]?.[1] ?? 1) - 1), submittedAt: n.steps[0] ? day(-n.steps[0][1]) : null, reviewedAt: decided && last ? day(-last[1]) : null,
      },
    });
    await prisma.newsStatusHistory.createMany({
      data: [{ proposalId: p.id, fromStatus: null, toStatus: 'DRAFT' as NewsStatus, actorId: a.userId, createdAt: day(-(n.steps[0]?.[1] ?? 1) - 1) },
        ...n.steps.map(([s, ago, note], i) => ({ proposalId: p.id, fromStatus: (i === 0 ? 'DRAFT' : n.steps[i - 1][0]) as NewsStatus, toStatus: s as NewsStatus, note: note ?? null, actorId: s === 'SUBMITTED' ? a.userId : staffId, createdAt: day(-ago) }))],
    });
  }
}

interface RepSpec { org: string; type: ReportType; title: string; summary: string; status: ReportStatus; ago: number; pdf: string; note?: string; period: [number, number] }
const REPORTS: RepSpec[] = [
  { org: 'horizon', type: 'ACTIVITY', title: 'Rapport d’activités annuel — Association Horizon Inclusif', summary: 'Bilan des actions de l’année : ateliers numériques, rencontres avec les familles et participation aux activités de la CAPH-CI.', status: 'PROCESSED', ago: 40, pdf: 'rapport-activites', period: [-400, -35] },
  { org: 'horizon', type: 'OTHER', title: 'Rapport de formation — atelier de comptabilité associative', summary: 'Compte rendu de la formation suivie par quatre membres : contenu, présence et recommandations.', status: 'IN_PROCESS', ago: 9, pdf: 'rapport-formation', period: [-20, -17] },
  { org: 'horizon', type: 'ACTIVITY', title: 'Rapport du projet « Inclusion par le numérique » — phase 1', summary: 'Premiers résultats des ateliers de Yopougon : nombre de jeunes accueillis, activités menées et difficultés rencontrées.', status: 'RECEIVED', ago: 3, pdf: 'rapport-projet', period: [-45, -5] },
  { org: 'poro', type: 'OTHER', title: 'Rapport de mission — visite de terrain dans les villages du Poro', summary: 'Mission de deux jours pour recenser les besoins d’accessibilité des services de santé dans quatre villages.', status: 'PROCESSED', ago: 28, pdf: 'rapport-mission', period: [-33, -31] },
  { org: 'gbeke', type: 'OTHER', title: 'Rapport de sensibilisation — journée scolaire inclusive', summary: 'Bilan d’une journée de sensibilisation dans deux écoles de Bouaké : activités, participation et suites prévues.', status: 'CORRECTION_REQUESTED', ago: 7, pdf: 'rapport-sensibilisation', note: 'Merci d’ajouter le nombre d’élèves touchés et les dates exactes.', period: [-14, -14] },
  { org: 'man', type: 'FINANCIAL', title: 'Rapport financier de l’exercice — Association Mains Unies de Man', summary: 'Recettes et dépenses de l’exercice, avec la répartition par activité.', status: 'RECEIVED', ago: 2, pdf: 'rapport-financier', period: [-400, -35] },
];
async function seedReports(A: Record<string, Actor>, staffId: string) {
  for (const r of REPORTS) {
    const a = A[r.org];
    const handled = r.status === 'PROCESSED' || r.status === 'CORRECTION_REQUESTED' || r.status === 'IN_PROCESS';
    const rep = await prisma.report.create({
      data: {
        isDemo: true, organizationId: a.orgId, authorId: a.userId, type: r.type, title: r.title, summary: r.summary, status: r.status, periodStart: day(r.period[0]), periodEnd: day(r.period[1]),
        certifiedAuthorityAt: day(-r.ago), reviewerNote: r.note ?? null, reviewedById: handled ? staffId : null, submittedAt: day(-r.ago), processedAt: r.status === 'PROCESSED' ? day(-r.ago + 3) : null,
      },
    });
    await prisma.reportAttachment.create({ data: { reportId: rep.id, fileId: await storeFile(`${r.pdf}.pdf`, 'application/pdf', a.userId) } });
  }
}

interface ProjSpec { org: string; title: string; description: string; context: string; objectives: string; beneficiaries: string; zone: string; start: number; end: number | null; budget: number | null; partners: string; expected: string; status: ProjectStatus; progress?: number; results?: string; steps: Step[]; note?: string }
const PROJECTS: ProjSpec[] = [
  { org: 'horizon', title: 'Inclusion par le numérique', description: 'Ateliers d’initiation à l’ordinateur et au téléphone pour des jeunes en situation de handicap, dans une salle accessible de Yopougon.', context: 'Beaucoup de jeunes n’ont jamais eu accès à un ordinateur, ce qui limite leurs chances de formation et d’emploi.', objectives: 'Former 60 jeunes aux usages de base du numérique.', beneficiaries: '60 jeunes de 15 à 30 ans', zone: 'Abidjan, Yopougon', start: -50, end: 130, budget: 3_500_000, partners: 'Mairie de Yopougon', expected: '60 jeunes formés et un petit centre de ressources.', status: 'ONGOING', progress: 40, results: '24 jeunes ont terminé le premier module. Une salle équipée de 8 ordinateurs est en service.', steps: [['SUBMITTED', 80], ['IN_REVIEW', 78], ['VALIDATED', 72, 'Projet validé.'], ['ONGOING', 50]] },
  { org: 'horizon', title: 'Café-rencontres des familles', description: 'Rencontres mensuelles pour permettre aux familles d’échanger sur le quotidien et sur les aides disponibles.', context: 'Les familles se sentent souvent isolées.', objectives: 'Créer un espace d’écoute et d’entraide.', beneficiaries: '40 familles', zone: 'Abidjan, Plateau', start: -300, end: -60, budget: 900_000, partners: 'Centre social du Plateau', expected: 'Douze rencontres organisées.', status: 'COMPLETED', progress: 100, results: 'Douze rencontres tenues, 38 familles participantes et un annuaire des aides locales publié.', steps: [['SUBMITTED', 330], ['VALIDATED', 320, 'Projet validé.'], ['ONGOING', 300], ['COMPLETED', 60]] },
  { org: 'horizon', title: 'Sport adapté pour tous', description: 'Séances hebdomadaires de sport adapté dans un terrain de quartier.', context: 'Peu d’activités sportives sont adaptées aux enfants en situation de handicap.', objectives: 'Proposer des séances accessibles à 30 enfants.', beneficiaries: '30 enfants', zone: 'Abidjan, Cocody', start: 40, end: 220, budget: 1_200_000, partners: 'Club sportif de Cocody', expected: 'Un groupe régulier de 30 enfants.', status: 'SUBMITTED', steps: [['SUBMITTED', 2]] },
  { org: 'horizon', title: 'Bibliothèque sonore de quartier', description: 'Enregistrement de livres audio pour les personnes malvoyantes.', context: 'Les ouvrages en format adapté sont rares.', objectives: '', beneficiaries: '', zone: 'Abidjan', start: 60, end: null, budget: null, partners: '', expected: '', status: 'DRAFT', steps: [] },
  { org: 'poro', title: 'Écoles accueillantes du Poro', description: 'Adaptation de salles de classe et formation d’enseignants pour accueillir des élèves malvoyants.', context: 'Peu d’écoles rurales disposent de matériel adapté.', objectives: 'Équiper 5 écoles et former 20 enseignants.', beneficiaries: '120 élèves, 20 enseignants', zone: 'Korhogo et villages du Poro', start: -90, end: 200, budget: 6_000_000, partners: 'Direction régionale de l’éducation', expected: '5 écoles équipées.', status: 'ONGOING', progress: 65, results: '3 écoles équipées sur 5 et 14 enseignants formés.', steps: [['SUBMITTED', 130], ['IN_REVIEW', 128], ['VALIDATED', 120], ['ONGOING', 90]] },
  { org: 'gbeke', title: 'Atelier couture et autonomie', description: 'Formation à la couture et à la gestion d’une petite activité pour des femmes en situation de handicap.', context: 'L’accès à un revenu stable reste difficile.', objectives: 'Former 25 femmes et accompagner 10 micro-activités.', beneficiaries: '25 femmes', zone: 'Bouaké', start: -30, end: 150, budget: 2_800_000, partners: 'Chambre des métiers', expected: '10 micro-activités lancées.', status: 'ONGOING', steps: [['SUBMITTED', 60], ['VALIDATED', 50, 'Projet validé.'], ['ONGOING', 30]] },
  { org: 'gbeke', title: 'Rampes d’accès au marché de Bouaké', description: 'Construction de rampes d’accès et signalisation au marché central.', context: 'Le marché est difficile d’accès pour les personnes à mobilité réduite.', objectives: 'Aménager 4 entrées.', beneficiaries: 'Usagers du marché', zone: 'Bouaké, marché central', start: -240, end: -70, budget: 4_500_000, partners: 'Mairie de Bouaké', expected: '4 entrées accessibles.', status: 'COMPLETED', progress: 100, results: '4 entrées aménagées et un plan de signalisation installé.', steps: [['SUBMITTED', 280], ['VALIDATED', 265], ['ONGOING', 240], ['COMPLETED', 70]] },
  { org: 'man', title: 'Initiation à la langue des signes dans les centres de santé', description: 'Cours courts pour les agents d’accueil de trois centres de santé.', context: 'Les personnes sourdes rencontrent des difficultés lors des consultations.', objectives: 'Former 30 agents à la langue des signes de base.', beneficiaries: '30 agents de santé', zone: 'Man et environs', start: 20, end: 160, budget: 1_800_000, partners: 'District sanitaire de Man', expected: '30 agents formés.', status: 'IN_REVIEW', steps: [['SUBMITTED', 6], ['IN_REVIEW', 3]] },
  { org: 'man', title: 'Jardin partagé inclusif', description: 'Création d’un jardin maraîcher accessible, cultivé par des membres de l’association.', context: 'Besoin d’activités génératrices de revenus.', objectives: 'Produire des légumes pour la vente locale.', beneficiaries: '15 membres', zone: 'Man', start: 30, end: 300, budget: 2_200_000, partners: '', expected: 'Un jardin de 2 000 m².', status: 'TO_COMPLETE', steps: [['SUBMITTED', 8], ['IN_REVIEW', 6], ['TO_COMPLETE', 3, 'Merci de préciser le terrain utilisé et l’accord du propriétaire.']], note: 'Merci de préciser le terrain utilisé et l’accord du propriétaire.' },
  { org: 'poro', title: 'Radio communautaire accessible', description: 'Émissions hebdomadaires sur les droits des personnes handicapées, avec traduction en langue locale.', context: 'Peu de médias locaux traitent du sujet.', objectives: 'Diffuser 40 émissions.', beneficiaries: 'Auditeurs du Poro', zone: 'Korhogo', start: 15, end: 380, budget: 3_000_000, partners: 'Radio locale de Korhogo', expected: '40 émissions.', status: 'REJECTED', steps: [['SUBMITTED', 25], ['IN_REVIEW', 23], ['REJECTED', 20, 'Le projet ne correspond pas aux axes prioritaires de cette année. Vous pouvez le représenter lors du prochain appel.']], note: 'Le projet ne correspond pas aux axes prioritaires de cette année. Vous pouvez le représenter lors du prochain appel.' },
  { org: 'man', title: 'Salle d’alphabétisation en braille', description: 'Ouverture d’une salle d’apprentissage du braille pour adultes.', context: 'Peu de structures proposent l’apprentissage du braille.', objectives: 'Alphabétiser 20 adultes.', beneficiaries: '20 adultes', zone: 'Man', start: 10, end: 250, budget: 2_000_000, partners: '', expected: '20 adultes alphabétisés.', status: 'VALIDATED', steps: [['SUBMITTED', 14], ['IN_REVIEW', 12], ['VALIDATED', 8, 'Projet validé. Démarrage possible à la date prévue.']], note: 'Projet validé. Démarrage possible à la date prévue.' },
];
async function seedProjects(A: Record<string, Actor>, staffId: string) {
  for (const p of PROJECTS) {
    const a = A[p.org];
    const first = p.steps[0]; const last = p.steps.at(-1);
    const decided = !['DRAFT', 'SUBMITTED', 'IN_REVIEW'].includes(p.status);
    const created = await prisma.project.create({
      data: {
        isDemo: true, organizationId: a.orgId, authorId: a.userId, title: p.title, description: p.description + NOTE, context: p.context || null, objectives: p.objectives || null,
        beneficiaries: p.beneficiaries || null, zone: p.zone, startDate: day(p.start), endDate: p.end === null ? null : day(p.end), budgetXof: p.budget, partners: p.partners || null,
        expectedResults: p.expected || null, status: p.status, reviewerNote: p.note ?? null, reviewedById: decided ? staffId : null,
        progress: p.progress ?? null, results: p.results ?? null, createdAt: day(-(first?.[1] ?? 1) - 1), submittedAt: first ? day(-first[1]) : null, reviewedAt: decided && last ? day(-last[1]) : null,
      },
    });
    await prisma.projectStatusHistory.createMany({
      data: [{ projectId: created.id, fromStatus: null, toStatus: 'DRAFT' as ProjectStatus, actorId: a.userId, createdAt: day(-(first?.[1] ?? 1) - 1) },
        ...p.steps.map(([s, ago, note], i) => ({ projectId: created.id, fromStatus: (i === 0 ? 'DRAFT' : p.steps[i - 1][0]) as ProjectStatus, toStatus: s as ProjectStatus, note: note ?? null, actorId: s === 'SUBMITTED' ? a.userId : staffId, createdAt: day(-ago) }))],
    });
  }
}

async function main() {
  await clearDemo();
  if (process.argv.includes('--clear')) return;
  const staff = await prisma.user.findUnique({ where: { email: 'communication@caphci.local' } });
  if (!staff) throw new Error('Compte communication@caphci.local introuvable : lancez d’abord le seed de base avec SEED_DEMO=true.');
  const A = await ensureOrgs();
  await seedCommunications(staff.id);
  await seedOpportunities(A, staff.id);
  await seedEvents(A, staff.id);
  await seedNews(A, staff.id);
  await seedReports(A, staff.id);
  await seedProjects(A, staff.id);
  console.log(`✔ Données de démonstration : ${OPPS.length} opportunités, ${EVENTS.length} événements, ${NEWS.length} actualités, ${REPORTS.length} rapports, ${PROJECTS.length} projets, 3 communications.`);
  console.log(`  Nouveaux comptes (mot de passe ${PASSWORD}) : mariam.traore@horizon-inclusif.example (Suppléante), ` + ORGS.map((o) => o.president[0]).join(', '));
}
main().catch((e) => { console.error('✖ Échec :', e.message); process.exit(1); }).finally(() => prisma.$disconnect());
