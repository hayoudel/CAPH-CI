import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { rmSync } from 'fs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { hashPassword } from '../src/common/utils/password';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

/** Tests du lot B5 : documents, opportunités, communications, agenda, rapports, actualités, tableau de bord, audit. */
const DEMO = 'Demo-Passw0rd!2026';
const ADMIN = 'admin@caphci.local';
const COMM = 'communication@caphci.local'; // documents, communications, agenda, actualités
const AWA = 'awa.kone@horizon-inclusif.example';     // Président OPH A
const KOFFI = 'koffi.yao@horizon-inclusif.example';  // Contributeur OPH A
const FATOU = 'fatou.diallo@horizon-inclusif.example'; // Consultation OPH A
const sent: { to: string; subject: string; text: string }[] = [];
const fakeMail = { send: async (m: any) => { sent.push(m); return true; } };
const stamp = Date.now();
const T = `T${stamp}`; // marqueur de nettoyage
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const FAKE_PDF = Buffer.from('ceci est du texte, pas un PDF');
const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();

describe('Contenus et espace membre (B5)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let startedAt: Date;
  let orgA: { id: string; delegationId: string | null };
  let orgB: { id: string };
  const tempEmails: string[] = [];
  const http = () => request(app.getHttpServer());
  const cache = new Map<string, string>();
  const tokenOf = async (email: string) => {
    if (!cache.has(email)) {
      const r = await http().post('/api/v1/auth/login').send({ email, password: DEMO });
      cache.set(email, r.body.accessToken as string);
    }
    return cache.get(email)!;
  };
  const h = async (email: string) => ({ Authorization: `Bearer ${await tokenOf(email)}` });
  const get = async (path: string, who: string) => { const a = await h(who); return http().get(`/api/v1${path}`).set(a); };
  const post = async (path: string, who: string, body: object = {}) => { const a = await h(who); return http().post(`/api/v1${path}`).set(a).send(body); };
  const patch = async (path: string, who: string, body: object = {}) => { const a = await h(who); return http().patch(`/api/v1${path}`).set(a).send(body); };
  const del = async (path: string, who: string) => { const a = await h(who); return http().delete(`/api/v1${path}`).set(a); };
  const upload = async (path: string, who: string, fields: Record<string, string>, buf: Buffer, name = `${T}-f.pdf`) => {
    const a = await h(who);
    let r = http().post(`/api/v1${path}`).set(a);
    for (const [k, v] of Object.entries(fields)) r = r.field(k, v);
    return r.attach('file', buf, { filename: name });
  };
  const bin = (rs: any, cb: any) => { const c: Buffer[] = []; rs.on('data', (x: Buffer) => c.push(x)); rs.on('end', () => cb(null, Buffer.concat(c))); };
  const download = async (path: string, who?: string) => {
    const a = who ? await h(who) : {};
    return http().get(`/api/v1${path}`).set(a).buffer(true).parse(bin);
  };

  async function tempUser(label: string, extra: Record<string, unknown> = {}) {
    const email = `test-${label}-${stamp}@test.example`;
    tempEmails.push(email);
    return prisma.user.create({ data: { email, firstName: 'Test', lastName: label, status: 'ACTIVE', passwordHash: await hashPassword(DEMO), ...extra } as any });
  }

  beforeAll(async () => {
    startedAt = new Date();
    const mod = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(MailService).useValue(fakeMail).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    orgA = await prisma.organization.findUniqueOrThrow({ where: { name: 'Association Horizon Inclusif' }, select: { id: true, delegationId: true } });
    // OPH « B » temporaire avec son Président
    const role = await prisma.role.findUniqueOrThrow({ where: { code: 'OPH_PRESIDENT' } });
    orgB = await prisma.organization.create({ data: { name: `OPH B5 ${T}`, status: 'ACTIVE' }, select: { id: true } });
    await tempUser('presb', { membership: { create: { organizationId: orgB.id, roleId: role.id } } });
    // Gestionnaire d'opportunités (aucun compte de démonstration)
    const opp = await prisma.role.findUniqueOrThrow({ where: { code: 'OPPORTUNITY_MANAGER' } });
    const u = await tempUser('opp');
    await prisma.userRole.create({ data: { userId: u.id, roleId: opp.id } as any });
    for (const e of [ADMIN, COMM, AWA, KOFFI, FATOU, `test-presb-${stamp}@test.example`, `test-opp-${stamp}@test.example`]) await tokenOf(e);
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({ where: { email: { in: tempEmails } }, select: { id: true } });
    const userIds = users.map((u) => u.id);
    const likeT = { contains: T };
    await prisma.internalDocument.deleteMany({ where: { title: likeT } });
    await prisma.opportunity.deleteMany({ where: { title: likeT } });
    await prisma.communication.deleteMany({ where: { title: likeT } });
    await prisma.event.deleteMany({ where: { title: likeT } });
    await prisma.report.deleteMany({ where: { title: likeT } });
    await prisma.newsProposal.deleteMany({ where: { title: likeT } });
    await prisma.fileAsset.deleteMany({ where: { originalName: { startsWith: T } } });
    await prisma.auditLog.deleteMany({
      where: { createdAt: { gte: startedAt }, OR: [{ action: { startsWith: 'document.' } }, { action: { startsWith: 'opportunity.' } }, { action: { startsWith: 'communication.' } }, { action: { startsWith: 'event.' } }, { action: { startsWith: 'report.' } }, { action: { startsWith: 'news.' } }] },
    });
    await prisma.organizationMember.deleteMany({ where: { organizationId: orgB.id } });
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.organization.deleteMany({ where: { id: orgB.id } });
    rmSync(process.env.STORAGE_DIR!, { recursive: true, force: true });
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe('Documents', () => {
    let open: any; let restricted: any;
    it('le responsable communication publie ; un membre ne peut pas publier', async () => {
      open = (await upload('/documents', COMM, { title: `Guide ${T}`, category: 'GUIDE' }, PDF)).body;
      restricted = (await upload('/documents', COMM, { title: `PV du CA ${T}`, category: 'MEETING_MINUTES', accessLevel: 'CONTRIBUTORS', isFeatured: 'true' }, PDF)).body;
      expect(open.id).toBeTruthy();
      expect(restricted.accessLevel).toBe('CONTRIBUTORS');
      expect(restricted.isFeatured).toBe(true);
      expect((await upload('/documents', AWA, { title: `Intrus ${T}`, category: 'GUIDE' }, PDF)).status).toBe(403);
      expect((await http().get('/api/v1/documents')).status).toBe(401);
    });
    it('le fichier est vérifié d’après son contenu, pas son nom', async () => {
      const r = await upload('/documents', COMM, { title: `Faux ${T}`, category: 'GUIDE' }, FAKE_PDF);
      expect(r.status).toBe(422);
      expect((await upload('/documents', COMM, { category: 'GUIDE' }, PDF)).status).toBe(422); // titre manquant
    });
    it('le Consultant ne voit pas les documents réservés aux Contributeurs, le Président si', async () => {
      const viewer = await get(`/documents?q=${encodeURIComponent(T)}`, FATOU);
      expect(viewer.body.data.map((d: any) => d.id)).toEqual([open.id]);
      const president = await get(`/documents?q=${encodeURIComponent(T)}`, AWA);
      expect(president.body.data.map((d: any) => d.id).sort()).toEqual([open.id, restricted.id].sort());
      expect(president.body.data[0].isFeatured).toBe(true); // mis en avant en premier
      expect((await get(`/documents/${restricted.id}`, FATOU)).status).toBe(404);
      expect((await get(`/documents/${restricted.id}/file`, FATOU)).status).toBe(404);
      expect((await get(`/documents/${restricted.id}`, KOFFI)).status).toBe(200);
    });
    it('téléchargement : contenu exact et en-têtes sûrs', async () => {
      const r = await download(`/documents/${open.id}/file`, FATOU);
      expect(r.status).toBe(200);
      expect(Buffer.compare(r.body, PDF)).toBe(0);
      expect(r.headers['cache-control']).toBe('no-store');
      expect(r.headers['x-content-type-options']).toBe('nosniff');
      expect((await download(`/documents/${open.id}/file`)).status).toBe(401);
    });
    it('filtre par catégorie ; archivage masque pour les membres mais pas pour les gestionnaires', async () => {
      const g = await get(`/documents?category=MEETING_MINUTES&q=${encodeURIComponent(T)}`, AWA);
      expect(g.body.data.map((d: any) => d.id)).toEqual([restricted.id]);
      expect((await post(`/documents/${open.id}/archive`, COMM)).status).toBe(200);
      expect((await get(`/documents/${open.id}`, FATOU)).status).toBe(404);
      expect((await get(`/documents?includeArchived=true&q=${encodeURIComponent(T)}`, COMM)).body.data.some((d: any) => d.id === open.id)).toBe(true);
      expect((await get(`/documents?includeArchived=true&q=${encodeURIComponent(T)}`, FATOU)).body.data.some((d: any) => d.id === open.id)).toBe(false);
      expect((await post(`/documents/${open.id}/restore`, COMM)).status).toBe(200);
      expect((await patch(`/documents/${open.id}`, COMM, { title: `Guide modifié ${T}` })).body.title).toContain('modifié');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe('Opportunités', () => {
    const OPP = `test-opp-${stamp}@test.example`;
    let pub: any; let priv: any; let ended: any;
    const body = (extra: object) => ({ type: 'CALL_FOR_PROJECTS', title: `Appel ${T}`, summary: 'Un appel à projets pour les associations.', ...extra });
    it('création réservée aux gestionnaires ; référence OP-AAAA-NN', async () => {
      expect((await post('/opportunities', AWA, body({}))).status).toBe(403);
      pub = (await post('/opportunities', OPP, body({ title: `Publique ${T}`, visibility: 'PUBLIC', deadline: iso(30) }))).body;
      priv = (await post('/opportunities', OPP, body({ title: `Membres ${T}`, type: 'TRAINING' }))).body;
      ended = (await post('/opportunities', OPP, body({ title: `Dépassée ${T}`, deadline: iso(-3) }))).body;
      expect(pub.reference).toMatch(/^OP-\d{4}-\d{2,}$/);
      expect(new Set([pub.reference, priv.reference, ended.reference]).size).toBe(3);
      expect(pub.effectiveStatus).toBe('OPEN');
      expect(ended.effectiveStatus).toBe('ENDED'); // date limite dépassée
    });
    it('les membres filtrent par type et par statut', async () => {
      const q = encodeURIComponent(T);
      const open = await get(`/opportunities?status=OPEN&q=${q}`, FATOU);
      expect(open.body.data.map((o: any) => o.id).sort()).toEqual([pub.id, priv.id].sort());
      const endedList = await get(`/opportunities?status=ENDED&q=${q}`, FATOU);
      expect(endedList.body.data.map((o: any) => o.id)).toEqual([ended.id]);
      const training = await get(`/opportunities?type=TRAINING&q=${q}`, AWA);
      expect(training.body.data.map((o: any) => o.id)).toEqual([priv.id]);
    });
    it('seules les opportunités « publiques » sont visibles sans connexion', async () => {
      const list = await http().get(`/api/v1/public/opportunities?q=${encodeURIComponent(T)}`);
      expect(list.status).toBe(200);
      expect(list.body.data.map((o: any) => o.id)).toEqual([pub.id]); // ni la privée, ni la dépassée
      expect((await http().get(`/api/v1/public/opportunities/${priv.id}`)).status).toBe(404);
      expect((await http().get(`/api/v1/public/opportunities/${pub.id}`)).status).toBe(200);
    });
    it('fiche à télécharger, clôture et archivage', async () => {
      expect((await upload(`/opportunities/${pub.id}/sheet`, OPP, {}, FAKE_PDF)).status).toBe(422);
      const up = await upload(`/opportunities/${pub.id}/sheet`, OPP, {}, PDF);
      expect(up.status).toBe(201);
      expect(up.body.hasSheet).toBe(true);
      const pubSheet = await download(`/opportunities/${pub.id}/sheet`);
      expect(pubSheet.status).toBe(401); // route membre : connexion requise
      expect(Buffer.compare((await download(`/public/opportunities/${pub.id}/sheet`)).body, PDF)).toBe(0);
      expect((await download(`/public/opportunities/${priv.id}/sheet`)).status).toBe(404);
      expect((await post(`/opportunities/${pub.id}/close`, OPP)).body.status).toBe('CLOSED');
      expect((await http().get(`/api/v1/public/opportunities?q=${encodeURIComponent(T)}`)).body.data).toHaveLength(0);
      expect((await post(`/opportunities/${priv.id}/archive`, OPP)).status).toBe(200);
      expect((await get(`/opportunities/${priv.id}`, FATOU)).status).toBe(404);
      expect((await get(`/opportunities/${priv.id}`, OPP)).status).toBe(200);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe('Communications et suivi de lecture', () => {
    let all: any; let onlyB: any; let ext: any;
    it('le contenu ciblé est invisible pour les autres organisations', async () => {
      expect((await post('/communications', AWA, { title: `Intrus ${T}`, body: 'Message interdit aux membres.' })).status).toBe(403);
      all = (await post('/communications', COMM, { title: `Pour tous ${T}`, body: 'Message destiné à toutes les organisations.', category: 'Information' })).body;
      onlyB = (await post('/communications', COMM, { title: `Pour B ${T}`, body: 'Message destiné à une seule organisation.', audienceAll: false, organizationIds: [orgB.id] })).body;
      expect(all.id).toBeTruthy();
      expect(onlyB.audienceAll).toBe(false);
      const awa = await get(`/communications?q=${encodeURIComponent(T)}`, AWA);
      expect(awa.body.data.map((c: any) => c.id)).toEqual([all.id]);
      expect((await get(`/communications/${onlyB.id}`, AWA)).status).toBe(404);
      expect((await post(`/communications/${onlyB.id}/read`, AWA)).status).toBe(404);
      const presB = `test-presb-${stamp}@test.example`;
      expect((await get(`/communications?q=${encodeURIComponent(T)}`, presB)).body.data).toHaveLength(2);
    });
    it('un message sans destinataire est refusé', async () => {
      const r = await post('/communications', COMM, { title: `Vide ${T}`, body: 'Aucun destinataire choisi ici.', audienceAll: false });
      expect(r.status).toBe(422);
      const r2 = await post('/communications', COMM, { title: `Cible ${T}`, body: 'Une organisation inconnue ici.', audienceAll: false, organizationIds: ['00000000-0000-4000-8000-000000000000'] });
      expect(r2.status).toBe(422);
    });
    it('lecture : la pastille « non lus » baisse, le suivi compte les lecteurs', async () => {
      const before = (await get('/communications/unread-count', AWA)).body.unread;
      expect(before).toBeGreaterThanOrEqual(1);
      const unreadList = await get(`/communications?unread=true&q=${encodeURIComponent(T)}`, AWA);
      expect(unreadList.body.data.map((c: any) => c.id)).toEqual([all.id]);
      expect(unreadList.body.data[0].isRead).toBe(false);
      const read = await get(`/communications/${all.id}`, AWA);
      expect(read.status).toBe(200);
      expect(read.body.body).toContain('toutes les organisations');
      expect((await get('/communications/unread-count', AWA)).body.unread).toBe(before - 1);
      expect((await get(`/communications?unread=true&q=${encodeURIComponent(T)}`, AWA)).body.data).toHaveLength(0);
      // un autre membre n'est pas affecté
      expect((await get(`/communications?unread=true&q=${encodeURIComponent(T)}`, KOFFI)).body.data).toHaveLength(1);
      await get(`/communications/${all.id}`, FATOU);
      const stats = (await get(`/communications/${all.id}/stats`, COMM)).body;
      expect(stats.read).toBeGreaterThanOrEqual(2);
      expect(stats.recipients).toBeGreaterThanOrEqual(stats.read);
      expect(stats.organizationsReached).toBeGreaterThanOrEqual(1);
      expect((await get(`/communications/${all.id}/stats`, AWA)).status).toBe(403);
      // la lecture par le personnel ne fausse pas le suivi
      await get(`/communications/${all.id}`, COMM);
      expect((await get(`/communications/${all.id}/stats`, COMM)).body.read).toBe(stats.read);
    });
    it('archivage : disparaît pour les membres', async () => {
      expect((await post(`/communications/${all.id}/archive`, COMM)).status).toBe(200);
      expect((await get(`/communications/${all.id}`, AWA)).status).toBe(404);
      expect((await post(`/communications/${all.id}/restore`, COMM)).status).toBe(200);
      expect((await get(`/communications/${all.id}`, AWA)).status).toBe(200);
    });
    it('communiqués publics : seulement « externe » adressé à tous', async () => {
      ext = (await post('/communications', COMM, { kind: 'EXTERNAL', title: `Communiqué ${T}`, body: 'Communiqué destiné au grand public.' })).body;
      const list = await http().get('/api/v1/public/communications?limit=100');
      expect(list.status).toBe(200);
      const ids = list.body.data.map((c: any) => c.id);
      expect(ids).toContain(ext.id);
      expect(ids).not.toContain(all.id);
      expect(ids).not.toContain(onlyB.id);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe('Agenda', () => {
    let future: any; let past: any;
    const ev = (extra: object) => ({ type: 'MEETING', title: `Réunion ${T}`, startsAt: iso(10), ...extra });
    it('création contrôlée', async () => {
      expect((await post('/events', AWA, ev({}))).status).toBe(403);
      expect((await post('/events', COMM, ev({ startsAt: iso(10), endsAt: iso(9) }))).status).toBe(422);
      expect((await post('/events', COMM, ev({ regionId: '00000000-0000-4000-8000-000000000000' }))).status).toBe(422);
      future = (await post('/events', COMM, ev({ title: `Assemblée ${T}`, type: 'GENERAL_ASSEMBLY', mode: 'HYBRID', location: 'Abidjan' }))).body;
      past = (await post('/events', COMM, ev({ title: `Ancienne ${T}`, startsAt: iso(-20), endsAt: iso(-19) }))).body;
      expect(future.mode).toBe('HYBRID');
    });
    it('à venir par défaut, passés avec past=true, filtre par type', async () => {
      const q = encodeURIComponent(T);
      expect((await get(`/events?q=${q}`, FATOU)).body.data.map((e: any) => e.id)).toEqual([future.id]);
      expect((await get(`/events?past=true&q=${q}`, FATOU)).body.data.map((e: any) => e.id)).toEqual([past.id]);
      expect((await get(`/events?type=TRAINING&q=${q}`, FATOU)).body.data).toHaveLength(0);
      expect((await get(`/events?type=GENERAL_ASSEMBLY&q=${q}`, FATOU)).body.data).toHaveLength(1);
      expect((await get(`/events?from=${iso(11).slice(0, 10)}&q=${q}`, FATOU)).body.data).toHaveLength(0);
    });
    it('agenda public : un événement annulé disparaît', async () => {
      const q = encodeURIComponent(T);
      expect((await http().get(`/api/v1/public/events?q=${q}`)).body.data.map((e: any) => e.id)).toEqual([future.id]);
      expect((await post(`/events/${future.id}/cancel`, COMM)).body.status).toBe('CANCELLED');
      expect((await http().get(`/api/v1/public/events?q=${q}`)).body.data).toHaveLength(0);
      expect((await get(`/events?q=${q}`, FATOU)).body.data[0].status).toBe('CANCELLED'); // les membres voient « annulé »
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe('Rapports', () => {
    let report: any;
    const rep = (extra: object = {}) => ({ type: 'ACTIVITY', title: `Rapport ${T}`, summary: 'Résumé de nos activités du semestre écoulé.', periodStart: '2026-01-01', periodEnd: '2026-06-30', certifyAuthority: true, ...extra });
    it('création : certification obligatoire, résumé limité à 600 caractères, réservé aux rôles autorisés', async () => {
      expect((await post('/reports', AWA, rep({ certifyAuthority: false }))).status).toBe(422);
      expect((await post('/reports', AWA, rep({ summary: 'x'.repeat(601) }))).status).toBe(422);
      expect((await post('/reports', AWA, rep({ periodStart: '2026-07-01', periodEnd: '2026-01-01' }))).status).toBe(422);
      expect((await post('/reports', FATOU, rep())).status).toBe(403); // Consultation
      report = (await post('/reports', KOFFI, rep())).body; // Contributeur
      expect(report.status).toBe('RECEIVED');
      expect(report.canEdit).toBe(true);
    });
    it('isolation : une autre organisation ne voit rien', async () => {
      const presB = `test-presb-${stamp}@test.example`;
      expect((await get(`/reports/${report.id}`, presB)).status).toBe(404);
      expect((await get(`/reports?q=${encodeURIComponent(T)}`, presB)).body.data).toHaveLength(0);
      expect((await get(`/reports/${report.id}`, FATOU)).status).toBe(200); // même organisation, en lecture
      expect((await patch(`/reports/${report.id}`, presB, { title: `Piraté ${T}` })).status).toBe(404);
    });
    it('pièces jointes : type vérifié, nombre limité, téléchargement par l’organisation et le personnel', async () => {
      expect((await upload(`/reports/${report.id}/attachments`, AWA, {}, FAKE_PDF)).status).toBe(422);
      const ok = await upload(`/reports/${report.id}/attachments`, AWA, {}, PDF);
      expect(ok.status).toBe(201);
      const att = ok.body.attachments[0];
      expect(Buffer.compare((await download(`/reports/${report.id}/attachments/${att.id}/file`, FATOU)).body, PDF)).toBe(0);
      expect(Buffer.compare((await download(`/reports/${report.id}/attachments/${att.id}/file`, ADMIN)).body, PDF)).toBe(0);
      for (let i = 0; i < 4; i++) expect((await upload(`/reports/${report.id}/attachments`, AWA, {}, PDF)).status).toBe(201);
      expect((await upload(`/reports/${report.id}/attachments`, AWA, {}, PDF)).status).toBe(422); // 6e refusée
      const after = await del(`/reports/${report.id}/attachments/${att.id}`, AWA);
      expect(after.body.attachments).toHaveLength(4);
    });
    it('le personnel traite le rapport : correction (motif obligatoire) puis renvoi par l’organisation', async () => {
      expect((await post(`/reports/${report.id}/review`, AWA, { status: 'PROCESSED' })).status).toBe(403);
      expect((await post(`/reports/${report.id}/review`, ADMIN, { status: 'CORRECTION_REQUESTED' })).status).toBe(422);
      const c = await post(`/reports/${report.id}/review`, ADMIN, { status: 'CORRECTION_REQUESTED', note: 'Précisez la période couverte.' });
      expect(c.status).toBe(200);
      expect(c.body.status).toBe('CORRECTION_REQUESTED');
      expect(sent.some((m) => m.to === AWA || m.to === 'koffi.yao@horizon-inclusif.example')).toBe(true);
      const org = (await get(`/reports/${report.id}`, AWA)).body;
      expect(org.reviewerNote).toBe('Précisez la période couverte.');
      const fixed = await patch(`/reports/${report.id}`, AWA, { summary: 'Résumé corrigé, période du 1er janvier au 30 juin 2026.' });
      expect(fixed.status).toBe(200);
      expect(fixed.body.status).toBe('RECEIVED'); // renvoyé automatiquement
    });
    it('traité = définitif ; le personnel hors périmètre ne voit pas le rapport', async () => {
      expect((await post(`/reports/${report.id}/review`, ADMIN, { status: 'IN_PROCESS' })).body.status).toBe('IN_PROCESS');
      expect((await patch(`/reports/${report.id}`, AWA, { title: `Trop tard ${T}` })).status).toBe(409);
      expect((await post(`/reports/${report.id}/review`, ADMIN, { status: 'PROCESSED' })).body.status).toBe('PROCESSED');
      expect((await post(`/reports/${report.id}/review`, ADMIN, { status: 'IN_PROCESS' })).status).toBe(409);
      // responsable de délégation d'une autre délégation
      const other = await prisma.delegation.create({ data: { name: `Délégation B5 ${T}` } });
      const role = await prisma.role.findUniqueOrThrow({ where: { code: 'DELEGATION_MANAGER' } });
      const u = await tempUser('deleg');
      await prisma.userRole.create({ data: { userId: u.id, roleId: role.id, delegationId: other.id } as any });
      const dm = `test-deleg-${stamp}@test.example`;
      expect((await get(`/reports/${report.id}`, dm)).status).toBe(404);
      expect((await get(`/reports?q=${encodeURIComponent(T)}`, dm)).body.data).toHaveLength(0);
      expect((await get(`/reports?q=${encodeURIComponent(T)}&limit=100`, ADMIN)).body.data.length).toBeGreaterThanOrEqual(1);
      await prisma.userRole.deleteMany({ where: { userId: u.id } });
      await prisma.refreshToken.deleteMany({ where: { userId: u.id } });
      await prisma.user.delete({ where: { id: u.id } });
      await prisma.delegation.delete({ where: { id: other.id } });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe('Actualités', () => {
    let news: any;
    it('une organisation propose ; la consultation seule ne le peut pas', async () => {
      const cats = await get('/news/categories', AWA);
      expect(cats.body.length).toBeGreaterThan(0);
      expect((await post('/news', FATOU, { title: `Intrus ${T}`, description: 'Une description assez longue pour passer.' })).status).toBe(403);
      expect((await post('/news', AWA, { title: `Court ${T}`, description: 'trop court' })).status).toBe(422);
      expect((await post('/news', AWA, { title: `Cat ${T}`, description: 'Une description assez longue pour passer.', categoryId: '00000000-0000-4000-8000-000000000000' })).status).toBe(422);
      news = (await post('/news', AWA, { title: `Journée portes ouvertes ${T}`, description: 'Notre association ouvre ses portes au public samedi prochain.', categoryId: cats.body[0].id })).body;
      expect(news.status).toBe('SUBMITTED');
      const presB = `test-presb-${stamp}@test.example`;
      expect((await get(`/news/${news.id}`, presB)).status).toBe(404);
      expect((await upload(`/news/${news.id}/attachments`, AWA, {}, PDF)).status).toBe(201);
    });
    it('l’équipe valide : motif obligatoire, correction puis nouvelle soumission', async () => {
      expect((await get('/admin/news', AWA)).status).toBe(403);
      const list = await get(`/admin/news?status=SUBMITTED&q=${encodeURIComponent(T)}`, COMM);
      expect(list.body.data.map((n: any) => n.id)).toEqual([news.id]);
      expect((await post(`/admin/news/${news.id}/review`, COMM, { status: 'CORRECTION' })).status).toBe(422);
      expect((await post(`/admin/news/${news.id}/review`, COMM, { status: 'PUBLISHED' })).status).toBe(409); // il faut d'abord approuver
      expect((await post(`/admin/news/${news.id}/review`, COMM, { status: 'CORRECTION', note: 'Ajoutez l’adresse de l’événement.' })).body.status).toBe('CORRECTION');
      expect((await get(`/news/${news.id}`, AWA)).body.reviewerNote).toContain('adresse');
      const fixed = await patch(`/news/${news.id}`, AWA, { description: 'Portes ouvertes samedi à 10 h, rue des Jardins, Yopougon, Abidjan.' });
      expect(fixed.body.status).toBe('SUBMITTED');
    });
    it('approbation, publication et diffusion publique', async () => {
      expect((await http().get(`/api/v1/public/news?q=${encodeURIComponent(T)}`)).body.data).toHaveLength(0);
      expect((await post(`/admin/news/${news.id}/review`, COMM, { status: 'APPROVED' })).body.status).toBe('APPROVED');
      expect((await patch(`/news/${news.id}`, AWA, { title: `Modifié ${T}` })).status).toBe(409); // traité : plus modifiable
      expect((await post(`/admin/news/${news.id}/review`, COMM, { status: 'PUBLISHED' })).body.status).toBe('PUBLISHED');
      const pub = await http().get('/api/v1/public/news?limit=100');
      const item = pub.body.data.find((n: any) => n.id === news.id);
      expect(item.organization).toBe('Association Horizon Inclusif');
      expect(item.author).toBeUndefined(); // aucune donnée personnelle
      expect((await post(`/admin/news/${news.id}/review`, COMM, { status: 'REJECTED', note: 'Trop tard.' })).status).toBe(409);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  describe('Tableau de bord et journal d’audit', () => {
    it('membre : synthèse de son organisation selon ses droits', async () => {
      expect((await http().get('/api/v1/dashboard')).status).toBe(401);
      const awa = (await get('/dashboard', AWA)).body;
      expect(awa.kind).toBe('MEMBER');
      expect(awa.organization.name).toBe('Association Horizon Inclusif');
      expect(awa.role.code).toBe('OPH_PRESIDENT');
      expect(typeof awa.unreadCommunications).toBe('number');
      expect(Array.isArray(awa.upcomingEvents)).toBe(true);
      expect(awa.reports).toBeTruthy();
      const fatou = (await get('/dashboard', FATOU)).body;
      expect(fatou.newsProposals).toBeNull(); // pas le droit de proposer des actualités
      expect(JSON.stringify(awa)).not.toContain('OPH B5'); // rien d'une autre organisation
    });
    it('personnel : blocs selon les permissions', async () => {
      const admin = (await get('/dashboard', ADMIN)).body;
      expect(admin.kind).toBe('STAFF');
      expect(admin.memberships.byStatus).toBeTruthy();
      expect(admin.reports).toHaveProperty('received');
      expect(admin.activeOrganizations).toBeGreaterThanOrEqual(1);
      const comm = (await get('/dashboard', COMM)).body;
      expect(comm.kind).toBe('STAFF');
      expect(comm.memberships).toBeNull(); // pas de droit sur les adhésions
      expect(comm.reports).toBeNull();
      expect(typeof comm.newsToReview).toBe('number');
    });
    it('audit : réservé à l’administrateur ; les actions de B5 y sont tracées', async () => {
      expect((await get('/admin/audit', COMM)).status).toBe(403);
      expect((await get('/admin/audit', AWA)).status).toBe(403);
      const r = await get('/admin/audit?action=report.&limit=100', ADMIN);
      expect(r.status).toBe(200);
      const actions = r.body.data.map((a: any) => a.action);
      expect(actions).toEqual(expect.arrayContaining(['report.submitted', 'report.reviewed']));
      const d = await get('/admin/audit?action=document.created&limit=100', ADMIN);
      expect(d.body.data.length).toBeGreaterThanOrEqual(2);
      expect((await get('/admin/audit?from=pas-une-date', ADMIN)).status).toBe(422);
    });
  });
});
