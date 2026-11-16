/**
 * Données de départ — idempotent (peut être relancé sans créer de doublons).
 *
 *  1. Toujours : permissions, rôles, catégories de demande, barème RI 2026,
 *     compte administrateur.
 *  2. Si SEED_DEMO=true : référentiels d'exemple + une OPH fictive avec ses 3 membres
 *     + 2 comptes du personnel. NE JAMAIS activer en production.
 *
 * Lancer : npm run prisma:seed
 */
import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ALL_PERMISSIONS, ROLES } from '../src/common/constants/permissions';
import { PASSWORD_REGEX, hashPassword } from '../src/common/utils/password';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEMO = process.env.SEED_DEMO === 'true';
const DEMO_PASSWORD = 'Demo-Passw0rd!2026';

// ───────────────────────────── Catégories de demande ──────────────────────────

type Req = 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL' | 'AFTER_ADMISSION';
const doc = (type: string, label: string, requirement: Req) => ({ type, label, requirement });

const CATEGORIES = [
  {
    code: 'PM_ORGANISATION',
    label: 'Organisation (personne morale)',
    description: "Association ou structure non lucrative intervenant dans le champ du handicap.",
    isActive: true, // seule catégorie ouverte (décision D1)
    sortOrder: 1,
    requiredDocuments: [
      doc('LEGAL_REGISTRATION', 'Récépissé ou document de régularité juridique', 'REQUIRED'),
      doc('STATUTES', 'Statuts ou document équivalent', 'REQUIRED'),
      doc('REPRESENTATIVE_ID', 'Pièce d’identité du représentant', 'REQUIRED'),
      doc('HABILITATION_PROOF', 'Document établissant l’habilitation à représenter la structure', 'RECOMMENDED'),
      doc('SIGNED_FORM', 'Bulletin d’adhésion signé', 'OPTIONAL'),
      doc('PAYMENT_PROOF', 'Justificatif de paiement', 'AFTER_ADMISSION'),
    ],
  },
  {
    code: 'PP_DISABLED_PERSON',
    label: 'Personne physique — personne handicapée',
    isActive: false, // en attente de la décision A-02
    sortOrder: 2,
    requiredDocuments: [
      doc('SIGNED_FORM', 'Bulletin signé', 'REQUIRED'),
      doc('IDENTITY', 'Copie d’une pièce d’identité', 'RECOMMENDED'),
      doc('PARENTAL_AUTHORIZATION', 'Autorisation parentale (mineur)', 'REQUIRED'),
      doc('PAYMENT_PROOF', 'Justificatif de paiement', 'AFTER_ADMISSION'),
    ],
  },
  {
    code: 'PP_GUARDIAN',
    label: 'Personne physique — parent, tuteur ou représentant',
    isActive: false,
    sortOrder: 3,
    requiredDocuments: [
      doc('SIGNED_FORM', 'Bulletin signé', 'REQUIRED'),
      doc('IDENTITY', 'Copie d’une pièce d’identité', 'RECOMMENDED'),
      doc('REPRESENTATION_PROOF', 'Justificatif de représentation ou de tutelle', 'RECOMMENDED'),
      doc('PAYMENT_PROOF', 'Justificatif de paiement', 'AFTER_ADMISSION'),
    ],
  },
  {
    code: 'PP_RECOGNIZED_COMMITMENT',
    label: 'Personne physique — engagement reconnu',
    isActive: false,
    sortOrder: 4,
    requiredDocuments: [
      doc('SIGNED_FORM', 'Bulletin signé', 'REQUIRED'),
      doc('IDENTITY', 'Copie d’une pièce d’identité', 'RECOMMENDED'),
      doc('PAYMENT_PROOF', 'Justificatif de paiement', 'AFTER_ADMISSION'),
    ],
  },
  {
    code: 'HONORARY',
    label: 'Membre honoraire',
    description: "Désigné par l'Assemblée Générale sur proposition du Conseil d'Administration.",
    isActive: false,
    sortOrder: 5,
    requiredDocuments: [
      doc('SUPPORTER_IDENTIFICATION', 'Coordonnées et identification du soutien', 'REQUIRED'),
      doc('CONTRIBUTION_PRESENTATION', 'Présentation de la contribution désintéressée', 'RECOMMENDED'),
    ],
  },
];

// Barème des droits et cotisations — Règlement intérieur 2026 (transitoire).
const FEES = [
  { code: 'ADHESION_PP', label: 'Adhésion personne physique', amountFcfa: 10000, periodicity: 'ONE_TIME' },
  { code: 'ADHESION_PM', label: 'Adhésion personne morale', amountFcfa: 25000, periodicity: 'ONE_TIME' },
  { code: 'CARD_ANNUAL', label: 'Carte annuelle', amountFcfa: 2000, periodicity: 'YEARLY' },
  { code: 'DUES_UNEMPLOYED', label: 'Cotisation : sans emploi', amountFcfa: 1000, periodicity: 'MONTHLY' },
  { code: 'DUES_LIBERAL', label: 'Cotisation : activité libérale', amountFcfa: 1500, periodicity: 'MONTHLY' },
  { code: 'DUES_PUBLIC_ADMIN', label: 'Cotisation : administration publique ou assimilée', amountFcfa: 3000, periodicity: 'MONTHLY' },
  { code: 'DUES_BOARD', label: 'Cotisation : CA ou Conseil de Surveillance', amountFcfa: 3000, periodicity: 'MONTHLY' },
  { code: 'DUES_AFFILIATED_ORG', label: 'Cotisation : association / organisation affiliée', amountFcfa: 5000, periodicity: 'MONTHLY' },
] as const;

// ──────────────────────────────── Fonctions ───────────────────────────────────

async function seedAccessControl() {
  for (const code of ALL_PERMISSIONS) {
    await prisma.permission.upsert({ where: { code }, update: {}, create: { code } });
  }
  const perms = await prisma.permission.findMany();
  const permId = new Map(perms.map((p) => [p.code, p.id]));

  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { label: r.label, scope: r.scope },
      create: { code: r.code, label: r.label, scope: r.scope },
    });
    // Resynchronise les permissions du rôle avec la matrice du code source.
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: r.permissions.map((c) => ({ roleId: role.id, permissionId: permId.get(c)! })),
    });
  }
  console.log(`✔ ${ALL_PERMISSIONS.length} permissions, ${ROLES.length} rôles`);
}

async function seedMembershipConfig() {
  for (const c of CATEGORIES) {
    const data = {
      label: c.label,
      description: c.description ?? null,
      isActive: c.isActive,
      sortOrder: c.sortOrder,
      requiredDocuments: c.requiredDocuments as unknown as Prisma.InputJsonValue,
    };
    await prisma.membershipCategory.upsert({ where: { code: c.code }, update: data, create: { code: c.code, ...data } });
  }
  for (const f of FEES) {
    await prisma.feeSchedule.upsert({
      where: { code: f.code },
      update: { label: f.label, amountFcfa: f.amountFcfa, periodicity: f.periodicity },
      create: { ...f },
    });
  }
  console.log(`✔ ${CATEGORIES.length} catégories de demande (1 active), ${FEES.length} lignes de barème`);
}

async function upsertUser(email: string, firstName: string, lastName: string, password: string, jobTitle?: string) {
  const passwordHash = await hashPassword(password);
  return prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {},
    create: {
      email: email.toLowerCase(), firstName, lastName, jobTitle, passwordHash,
      status: 'ACTIVE', passwordChangedAt: new Date(),
    },
  });
}

async function grantStaffRole(userId: string, roleCode: string) {
  const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
  const exists = await prisma.userRole.findFirst({ where: { userId, roleId: role.id, delegationId: null } });
  if (!exists) await prisma.userRole.create({ data: { userId, roleId: role.id } });
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@caphci.local';
  const password = process.env.SEED_ADMIN_PASSWORD || (DEMO ? DEMO_PASSWORD : '');
  if (!password) {
    throw new Error('SEED_ADMIN_PASSWORD est obligatoire (sauf en mode SEED_DEMO=true).');
  }
  if (!PASSWORD_REGEX.test(password)) {
    throw new Error('SEED_ADMIN_PASSWORD ne respecte pas la politique (12 car., Maj, min, chiffre, spécial).');
  }
  const admin = await upsertUser(email, 'Administrateur', 'CAPH-CI', password, 'Administrateur général');
  await grantStaffRole(admin.id, 'ADMIN');
  console.log(`✔ Administrateur : ${email}`);
}

async function seedDemo() {
  const regions = [
    ['ABJ', "District autonome d'Abidjan"], ['AGT', 'Agnéby-Tiassa'], ['PRO', 'Poro'],
    ['BEL', 'Bélier'], ['GBE', 'Gbêkê'], ['TON', 'Tonkpi'],
  ];
  const regionIds: Record<string, string> = {};
  for (const [code, name] of regions) {
    const r = await prisma.region.upsert({ where: { code }, update: {}, create: { code, name } });
    regionIds[code] = r.id;
    await prisma.delegation.upsert({
      where: { name: `Délégation de ${name}` }, update: {},
      create: { name: `Délégation de ${name}`, regionId: r.id },
    });
  }

  const domains = [
    ['INCLUSION_PLAIDOYER', 'Inclusion sociale et plaidoyer'],
    ['AUTONOMIE_CITOYENNETE', 'Autonomie et participation citoyenne'],
    ['EDUCATION', 'Éducation inclusive'],
    ['EMPLOI', 'Emploi et employabilité'],
    ['SANTE', 'Santé et réadaptation'],
  ];
  for (const [i, [code, label]] of domains.entries()) {
    await prisma.interventionDomain.upsert({ where: { code }, update: {}, create: { code, label, sortOrder: i } });
  }
  const disabilities = [
    ['VISUAL', 'Handicap visuel'], ['HEARING', 'Handicap auditif'], ['MOTOR', 'Handicap moteur'],
    ['INTELLECTUAL', 'Handicap intellectuel'], ['PSYCHOSOCIAL', 'Handicap psychosocial'], ['ALL', 'Tous types de handicap'],
  ];
  for (const [i, [code, label]] of disabilities.entries()) {
    await prisma.disabilityType.upsert({ where: { code }, update: {}, create: { code, label, sortOrder: i } });
  }
  const news = [['ACTIVITIES', 'Activités des OPH'], ['EVENTS', 'Événements'], ['RESOURCES', 'Ressources utiles']];
  for (const [i, [code, label]] of news.entries()) {
    await prisma.newsCategory.upsert({ where: { code }, update: {}, create: { code, label, sortOrder: i } });
  }

  // OPH fictive (domaine .example : jamais de vrais e-mails)
  const delegation = await prisma.delegation.findUniqueOrThrow({ where: { name: 'Délégation de Agnéby-Tiassa' } });
  const domain = await prisma.interventionDomain.findUniqueOrThrow({ where: { code: 'INCLUSION_PLAIDOYER' } });
  const disability = await prisma.disabilityType.findUniqueOrThrow({ where: { code: 'ALL' } });
  const org = await prisma.organization.upsert({
    where: { name: 'Association Horizon Inclusif' },
    update: {},
    create: {
      name: 'Association Horizon Inclusif', acronym: 'AHI', status: 'ACTIVE',
      memberNumber: 'DEMO-0001', registeredAt: new Date(),
      delegationId: delegation.id, regionId: regionIds['AGT'], commune: 'Plateau',
      address: 'Plateau Indénié', postalAddress: 'Abidjan, Côte d’Ivoire',
      email: 'horizoninclusif@horizon-inclusif.example',
      publicEmail: 'contact@horizon-inclusif.example', publicPhone: '+225 27 00 00 00 00',
      website: 'https://www.horizon-inclusif.example',
      isListed: true, publicationConsentAt: new Date(),
      fieldVisibility: { publicEmail: true, publicPhone: true, postalAddress: false, website: true },
      domains: { connect: [{ id: domain.id }] },
      disabilityTypes: { connect: [{ id: disability.id }] },
    },
  });

  const members: [string, string, string, string, string][] = [
    ['amari.lattro@horizon-inclusif.example', 'Amari', 'Lattro', 'OPH_PRESIDENT', 'Présidente'],
    ['koffi.yao@horizon-inclusif.example', 'Koffi', 'Yao', 'OPH_CONTRIBUTOR', 'Chargé de communication'],
    ['fatou.diallo@horizon-inclusif.example', 'Fatou', 'Diallo', 'OPH_VIEWER', 'Membre'],
  ];
  for (const [email, first, last, roleCode, job] of members) {
    const u = await upsertUser(email, first, last, DEMO_PASSWORD, job);
    const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    await prisma.organizationMember.upsert({
      where: { userId: u.id }, update: {},
      create: { userId: u.id, organizationId: org.id, roleId: role.id },
    });
  }

  const gest = await upsertUser('gestionnaire@caphci.local', 'Gestionnaire', 'Adhésions', DEMO_PASSWORD, 'Secrétariat permanent');
  await grantStaffRole(gest.id, 'MEMBERSHIP_MANAGER');
  await grantStaffRole(gest.id, 'DECISION_MAKER');
  const com = await upsertUser('communication@caphci.local', 'Responsable', 'Communication', DEMO_PASSWORD, 'Responsable communication');
  await grantStaffRole(com.id, 'COMMUNICATION_MANAGER');

  console.log('✔ Données de démonstration (mot de passe de tous les comptes démo : ' + DEMO_PASSWORD + ')');
}

async function main() {
  await seedAccessControl();
  await seedMembershipConfig();
  await seedAdmin();
  if (DEMO) await seedDemo();
  else console.log('ℹ Mode production : aucune donnée de démonstration ajoutée.');
}

main()
  .catch((e) => { console.error('✖ Échec du seed :', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
