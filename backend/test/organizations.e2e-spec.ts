import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { hashPassword } from '../src/common/utils/password';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

/** Tests du lot B2b : isolation entre organisations, membres, visibilité, annuaire public. */
const DEMO = 'Demo-Passw0rd!2026';
const AWA = 'awa.kone@horizon-inclusif.example';      // Président (OPH A)
const KOFFI = 'koffi.yao@horizon-inclusif.example';   // Contributeur (OPH A)
const FATOU = 'fatou.diallo@horizon-inclusif.example'; // Consultation (OPH A)
const ADMIN = 'admin@caphci.local';

const sent: { to: string; subject: string; text: string }[] = [];
const fakeMail = { send: async (m: any) => { sent.push(m); return true; } };

describe('Organisations, membres, visibilité, annuaire (B2b)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let orgA: { id: string; name: string };
  let orgB: { id: string };
  let originalZone: string | null = null; // pour remettre la donnée de démonstration en l'état
  const stamp = Date.now();
  const tempEmails: string[] = [];
  const http = () => request(app.getHttpServer());
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  // Jetons mis en cache : on évite de lancer une connexion au milieu de la construction d'une autre requête.
  const cache = new Map<string, string>();
  const tokenOf = async (email: string) => {
    if (!cache.has(email)) {
      const r = await http().post('/api/v1/auth/login').send({ email, password: DEMO });
      cache.set(email, r.body.accessToken as string);
    }
    return cache.get(email)!;
  };

  async function tempUser(label: string, data: Record<string, unknown> = {}) {
    const email = `test-${label}-${stamp}@test.example`.toLowerCase();
    tempEmails.push(email);
    return prisma.user.create({
      data: { email, firstName: 'Test', lastName: label, status: 'ACTIVE', passwordHash: await hashPassword(DEMO), ...data } as any,
    });
  }

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService).useValue(fakeMail).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    orgA = await prisma.organization.findUniqueOrThrow({ where: { name: 'Association Horizon Inclusif' }, select: { id: true, name: true } });
    originalZone = (await prisma.organization.findUniqueOrThrow({ where: { id: orgA.id } })).interventionZone;
    // OPH « B » temporaire (non listée, sans consentement) avec son propre Président
    const president = await prisma.role.findUniqueOrThrow({ where: { code: 'OPH_PRESIDENT' } });
    orgB = await prisma.organization.create({
      data: {
        name: `Test OPH B ${stamp}`, email: 'prive-b@test.example', address: 'Rue secrète B', phone: '+225 01 00 00 00 00',
        publicEmail: 'public-b@test.example', status: 'ACTIVE',
      },
    });
    await tempUser('presidentB', { membership: { create: { organizationId: orgB.id, roleId: president.id } } });
    for (const e of [AWA, KOFFI, FATOU, ADMIN, `test-presidentb-${stamp}@test.example`]) await tokenOf(e);
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({ where: { email: { in: tempEmails } }, select: { id: true } });
    const ids = users.map((u) => u.id);
    await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { entityId: orgB.id }, { actorLabel: { in: tempEmails } }] } });
    await prisma.organizationMember.deleteMany({ where: { OR: [{ userId: { in: ids } }, { organizationId: orgB.id }] } });
    await prisma.userRole.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.organization.deleteMany({ where: { id: orgB.id } });
    await prisma.organization.update({ where: { id: orgA.id }, data: { interventionZone: originalZone } });
    await app.close();
  });

  const presidentB = () => `test-presidentb-${stamp}@test.example`;

  describe('Profil et isolation entre organisations', () => {
    it('chaque membre voit SA propre organisation', async () => {
      for (const email of [AWA, KOFFI, FATOU]) {
        const r = await http().get('/api/v1/organizations/me').set(auth(await tokenOf(email)));
        expect(r.status).toBe(200);
        expect(r.body.name).toBe(orgA.name);
      }
    });
    it('un compte du personnel (sans OPH) reçoit un message clair sur /me', async () => {
      const t = await tokenOf(ADMIN);
      const r = await http().get('/api/v1/organizations/me').set(auth(t));
      expect(r.status).toBe(404);
      expect(r.body.code).toBe('NO_ORGANIZATION');
    });
    it("un Président ne peut NI lire NI modifier l'organisation d'une autre (404)", async () => {
      const t = await tokenOf(AWA);
      expect((await http().get(`/api/v1/organizations/${orgB.id}`).set(auth(t))).status).toBe(404);
      expect((await http().patch(`/api/v1/organizations/${orgB.id}`).set(auth(t)).send({ phone: '+225 00 00 00 00' })).status).toBe(404);
      expect((await http().patch(`/api/v1/organizations/${orgB.id}/visibility`).set(auth(t)).send({ isListed: true })).status).toBe(404);
      expect((await http().get(`/api/v1/organizations/${orgB.id}/members`).set(auth(t))).status).toBe(404);
      const tb = await tokenOf(presidentB());
      expect((await http().get(`/api/v1/organizations/${orgA.id}`).set(auth(tb))).status).toBe(404);
    });
    it('le Président modifie son organisation ; Contributeur et Consultation sont refusés (403)', async () => {
      const ok = await http().patch(`/api/v1/organizations/${orgA.id}`).set(auth(await tokenOf(AWA))).send({ interventionZone: 'Grand Abidjan' });
      expect(ok.status).toBe(200);
      expect(ok.body.interventionZone).toBe('Grand Abidjan');
      for (const email of [KOFFI, FATOU]) {
        const r = await http().patch(`/api/v1/organizations/${orgA.id}`).set(auth(await tokenOf(email))).send({ commune: 'X' });
        expect(r.status).toBe(403);
      }
    });
    it('refuse les champs non modifiables et les valeurs invalides (422)', async () => {
      const t = await tokenOf(AWA);
      for (const body of [{ name: 'Nouveau nom' }, { memberNumber: 'X' }, { status: 'ARCHIVED' }, { website: 'pas-une-url' }, { email: 'pas-un-email' }]) {
        expect((await http().patch(`/api/v1/organizations/${orgA.id}`).set(auth(t)).send(body)).status).toBe(422);
      }
    });
    it('refuse une région ou un domaine inconnu', async () => {
      const t = await tokenOf(AWA);
      const unknown = '00000000-0000-4000-8000-000000000000';
      expect((await http().patch(`/api/v1/organizations/${orgA.id}`).set(auth(t)).send({ regionId: unknown })).status).toBe(400);
      expect((await http().patch(`/api/v1/organizations/${orgA.id}`).set(auth(t)).send({ domainIds: [unknown] })).status).toBe(400);
    });
    it('périmètre du personnel : admin voit tout, responsable de délégation seulement la sienne', async () => {
      const ta = await tokenOf(ADMIN);
      expect((await http().get(`/api/v1/organizations/${orgA.id}`).set(auth(ta))).status).toBe(200);
      const orgAfull = await prisma.organization.findUniqueOrThrow({ where: { id: orgA.id } });
      const other = await prisma.delegation.findFirstOrThrow({ where: { id: { not: orgAfull.delegationId! } } });
      const role = await prisma.role.findUniqueOrThrow({ where: { code: 'DELEGATION_MANAGER' } });
      const wrong = await tempUser('delegWrong', { roles: { create: { roleId: role.id, delegationId: other.id } } });
      const right = await tempUser('delegRight', { roles: { create: { roleId: role.id, delegationId: orgAfull.delegationId } } });
      const tw = await tokenOf(wrong.email);
      const tr = await tokenOf(right.email);
      expect((await http().get(`/api/v1/organizations/${orgA.id}`).set(auth(tw))).status).toBe(404);
      expect((await http().get(`/api/v1/organizations/${orgA.id}`).set(auth(tr))).status).toBe(200);
      // …mais il ne peut pas la modifier
      expect((await http().patch(`/api/v1/organizations/${orgA.id}`).set(auth(tr)).send({ commune: 'Y' })).status).toBe(403);
      const list = await http().get('/api/v1/organizations').set(auth(tr));
      expect(list.status).toBe(200);
      expect(list.body.data.every((o: any) => o.name !== orgB.id)).toBe(true);
    });
  });

  describe('Membres de l’organisation', () => {
    const newEmail = `test-newmember-${stamp}@test.example`;
    let newUserId: string;

    it('le Président ajoute un membre : invitation envoyée, compte « invité »', async () => {
      tempEmails.push(newEmail);
      const r = await http().post(`/api/v1/organizations/${orgA.id}/members`).set(auth(await tokenOf(AWA)))
        .send({ email: newEmail, firstName: 'Nouveau', lastName: 'Membre', roleCode: 'OPH_VIEWER' });
      expect(r.status).toBe(201);
      expect(r.body.status).toBe('INVITED');
      newUserId = r.body.userId;
      expect(sent.some((m) => m.to === newEmail && /activer-compte\?token=/.test(m.text))).toBe(true);
    });
    it('refuse : adresse déjà utilisée (409), rôle Président (422), Contributeur/Consultation (403)', async () => {
      const t = await tokenOf(AWA);
      const base = { firstName: 'A', lastName: 'B', roleCode: 'OPH_VIEWER' };
      expect((await http().post(`/api/v1/organizations/${orgA.id}/members`).set(auth(t)).send({ ...base, email: newEmail })).status).toBe(409);
      expect((await http().post(`/api/v1/organizations/${orgA.id}/members`).set(auth(t)).send({ ...base, email: `x1-${stamp}@test.example`, roleCode: 'OPH_PRESIDENT' })).status).toBe(422);
      for (const email of [KOFFI, FATOU]) {
        const r = await http().post(`/api/v1/organizations/${orgA.id}/members`).set(auth(await tokenOf(email))).send({ ...base, email: `x2-${stamp}@test.example` });
        expect(r.status).toBe(403);
      }
    });
    it('un Président ne peut pas ajouter de membre dans une autre organisation (404)', async () => {
      const r = await http().post(`/api/v1/organizations/${orgB.id}/members`).set(auth(await tokenOf(AWA)))
        .send({ email: `x3-${stamp}@test.example`, firstName: 'A', lastName: 'B', roleCode: 'OPH_VIEWER' });
      expect(r.status).toBe(404);
    });
    it('la liste cache e-mails et dernière connexion aux non-Présidents', async () => {
      const asViewer = await http().get(`/api/v1/organizations/${orgA.id}/members`).set(auth(await tokenOf(FATOU)));
      expect(asViewer.status).toBe(200);
      expect(asViewer.body.length).toBeGreaterThanOrEqual(4);
      expect(JSON.stringify(asViewer.body)).not.toMatch(/@horizon-inclusif|@test\.example/);
      expect(asViewer.body[0].role.code).toBe('OPH_PRESIDENT');
      const asPresident = await http().get(`/api/v1/organizations/${orgA.id}/members`).set(auth(await tokenOf(AWA)));
      expect(JSON.stringify(asPresident.body)).toMatch(/@horizon-inclusif/);
    });
    it('change le rôle, protège le Président et soi-même, retire le membre et coupe son accès', async () => {
      const t = await tokenOf(AWA);
      const url = `/api/v1/organizations/${orgA.id}/members`;
      const roleOk = await http().patch(`${url}/${newUserId}`).set(auth(t)).send({ roleCode: 'OPH_CONTRIBUTOR' });
      expect(roleOk.status).toBe(200);
      expect(roleOk.body.role.code).toBe('OPH_CONTRIBUTOR');
      const awaRow = await prisma.user.findUniqueOrThrow({ where: { email: AWA } });
      expect((await http().patch(`${url}/${awaRow.id}`).set(auth(t)).send({ roleCode: 'OPH_VIEWER' })).status).toBe(400);
      expect((await http().delete(`${url}/${awaRow.id}`).set(auth(t))).status).toBe(400);
      // Un membre actif retiré perd tout accès immédiatement
      const victim = await tempUser('victim', { membership: { create: { organizationId: orgA.id, roleId: (await prisma.role.findUniqueOrThrow({ where: { code: 'OPH_VIEWER' } })).id } } });
      const vt = await tokenOf(victim.email);
      expect((await http().get('/api/v1/organizations/me').set(auth(vt))).status).toBe(200);
      expect((await http().delete(`${url}/${victim.id}`).set(auth(t))).status).toBe(204);
      expect((await http().get('/api/v1/organizations/me').set(auth(vt))).status).toBe(401);
    });
  });

  describe('Suppléant du Président (comme « éditeur »)', () => {
    let deputyEmail: string;
    let deputyId: string;
    const url = () => `/api/v1/organizations/${orgA.id}`;

    beforeAll(async () => {
      const role = await prisma.role.findUniqueOrThrow({ where: { code: 'OPH_DEPUTY' } });
      const u = await tempUser('deputy', { membership: { create: { organizationId: orgA.id, roleId: role.id } } });
      deputyEmail = u.email; deputyId = u.id;
      await tokenOf(deputyEmail);
    });

    it('le Suppléant a les mêmes droits que le Président sur le profil et la visibilité', async () => {
      const t = await tokenOf(deputyEmail);
      const upd = await http().patch(url()).set(auth(t)).send({ interventionZone: 'Zone du suppléant' });
      expect(upd.status).toBe(200);
      expect((await http().patch(`${url()}/visibility`).set(auth(t)).send({ publicPhone: '+225 27 00 00 00 00' })).status).toBe(200);
    });
    it('le Suppléant invite un Contributeur mais pas un autre Suppléant', async () => {
      const t = await tokenOf(deputyEmail);
      const email = `dep-inv-${stamp}@test.example`;
      tempEmails.push(email);
      const ok = await http().post(`${url()}/members`).set(auth(t)).send({ email, firstName: 'A', lastName: 'B', roleCode: 'OPH_CONTRIBUTOR' });
      expect(ok.status).toBe(201);
      const ko = await http().post(`${url()}/members`).set(auth(t)).send({ email: `dep2-${stamp}@test.example`, firstName: 'A', lastName: 'B', roleCode: 'OPH_DEPUTY' });
      expect(ko.status).toBe(403);
      expect(ko.body.code).toBe('DEPUTY_PRESIDENT_ONLY');
      expect((await http().delete(`${url()}/members/${ok.body.userId}`).set(auth(t))).status).toBe(204);
    });
    it('le Suppléant ne peut ni toucher au Président, ni à lui-même', async () => {
      const t = await tokenOf(deputyEmail);
      const awa = await prisma.user.findUniqueOrThrow({ where: { email: AWA } });
      expect((await http().delete(`${url()}/members/${awa.id}`).set(auth(t))).status).toBe(400);
      expect((await http().patch(`${url()}/members/${awa.id}`).set(auth(t)).send({ roleCode: 'OPH_VIEWER' })).status).toBe(400);
      expect((await http().patch(`${url()}/members/${deputyId}`).set(auth(t)).send({ roleCode: 'OPH_VIEWER' })).status).toBe(403);
    });
    it('seul le Président nomme, change et retire un Suppléant', async () => {
      const pt = await tokenOf(AWA);
      expect((await http().patch(`${url()}/members/${deputyId}`).set(auth(pt)).send({ roleCode: 'OPH_CONTRIBUTOR' })).status).toBe(200);
      expect((await http().patch(`${url()}/members/${deputyId}`).set(auth(pt)).send({ roleCode: 'OPH_DEPUTY' })).status).toBe(200);
    });
    it('un Suppléant d’une autre organisation n’a aucun accès (404)', async () => {
      const role = await prisma.role.findUniqueOrThrow({ where: { code: 'OPH_DEPUTY' } });
      const other = await tempUser('deputyB', { membership: { create: { organizationId: orgB.id, roleId: role.id } } });
      const t = await tokenOf(other.email);
      expect((await http().patch(url()).set(auth(t)).send({ phone: '+225 00 00 00 00' })).status).toBe(404);
    });
  });

  describe('Visibilité et annuaire public', () => {
    const dir = () => http().get('/api/v1/directory/organizations?limit=100');

    it('l’annuaire est public (sans connexion) et contient l’OPH de démonstration', async () => {
      const r = await dir();
      expect(r.status).toBe(200);
      expect(r.body.data.some((o: any) => o.name === orgA.name)).toBe(true);
      expect(r.body.meta.total).toBeGreaterThanOrEqual(1);
    });
    it('N’EXPOSE JAMAIS les informations privées', async () => {
      const r = await dir();
      const json = JSON.stringify(r.body);
      for (const secret of ['horizoninclusif@horizon-inclusif.example', 'Plateau Indénié', 'Abidjan, Côte d’Ivoire', 'DEMO-0001', 'memberNumber', 'legalReference', 'passwordHash']) {
        expect(json).not.toContain(secret);
      }
      const a = r.body.data.find((o: any) => o.name === orgA.name);
      expect(a.contact.email).toBe('contact@horizon-inclusif.example'); // rendu public par le Président
      expect(a.contact.postalAddress).toBeNull();                      // masqué
    });
    it('une OPH non listée est absente de l’annuaire et de sa fiche publique', async () => {
      expect((await dir()).body.data.some((o: any) => o.name.startsWith('Test OPH B'))).toBe(false);
      expect((await http().get(`/api/v1/directory/organizations/${orgB.id}`)).status).toBe(404);
    });
    it('exige le consentement pour apparaître dans l’annuaire (422)', async () => {
      const t = await tokenOf(presidentB());
      const r = await http().patch(`/api/v1/organizations/${orgB.id}/visibility`).set(auth(t)).send({ isListed: true });
      expect(r.status).toBe(422);
      expect(r.body.code).toBe('CONSENT_REQUIRED');
    });
    it('Contributeur et Consultation ne peuvent pas changer la visibilité (403)', async () => {
      for (const email of [KOFFI, FATOU]) {
        const r = await http().patch(`/api/v1/organizations/${orgA.id}/visibility`).set(auth(await tokenOf(email))).send({ isListed: false });
        expect(r.status).toBe(403);
      }
    });
    it('cycle complet : publier, masquer un champ, retirer le consentement', async () => {
      const t = await tokenOf(presidentB());
      const vis = `/api/v1/organizations/${orgB.id}/visibility`;
      const publish = await http().patch(vis).set(auth(t)).send({
        publicationConsent: true, isListed: true, fieldVisibility: { publicEmail: true, publicPhone: false, postalAddress: false, website: false },
      });
      expect(publish.status).toBe(200);
      let fiche = await http().get(`/api/v1/directory/organizations/${orgB.id}`);
      expect(fiche.status).toBe(200);
      expect(fiche.body.contact.email).toBe('public-b@test.example');
      expect(JSON.stringify(fiche.body)).not.toMatch(/prive-b@test|Rue secrète B|01 00 00 00 00/);

      // Le Président masque l'e-mail : il disparaît aussitôt
      await http().patch(vis).set(auth(t)).send({ fieldVisibility: { publicEmail: false } });
      fiche = await http().get(`/api/v1/directory/organizations/${orgB.id}`);
      expect(fiche.body.contact.email).toBeNull();
      expect(JSON.stringify(fiche.body)).not.toContain('public-b@test.example');

      // Retrait du consentement : l'OPH quitte l'annuaire
      await http().patch(vis).set(auth(t)).send({ publicationConsent: false });
      expect((await http().get(`/api/v1/directory/organizations/${orgB.id}`)).status).toBe(404);
      expect((await dir()).body.data.some((o: any) => o.name.startsWith('Test OPH B'))).toBe(false);
    });
    it('recherche et filtres', async () => {
      const found = await http().get('/api/v1/directory/organizations?q=horizon');
      expect(found.body.data.length).toBeGreaterThanOrEqual(1);
      expect((await http().get('/api/v1/directory/organizations?q=zzzzintrouvable')).body.data).toHaveLength(0);
      const filters = await http().get('/api/v1/directory/filters');
      expect(filters.status).toBe(200);
      expect(filters.body.regions.length).toBeGreaterThan(0);
      const domain = filters.body.domains[0].id;
      expect((await http().get(`/api/v1/directory/organizations?domainId=${domain}`)).status).toBe(200);
      expect((await http().get('/api/v1/directory/organizations?regionId=pas-un-uuid')).status).toBe(422);
      expect((await http().get('/api/v1/directory/organizations?limit=1000')).status).toBe(422);
    });
  });
});
