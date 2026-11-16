import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { rmSync } from 'fs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { hashPassword } from '../src/common/utils/password';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

/** Tests du lot B4 : gestion des adhésions par le personnel CAPH-CI. */
const DEMO = 'Demo-Passw0rd!2026';
const MANAGER = 'gestionnaire@caphci.local'; // MEMBERSHIP_MANAGER + DECISION_MAKER
const COMM = 'communication@caphci.local';   // sans droit sur les adhésions
const AWA = 'awa.kone@horizon-inclusif.example'; // Président d'une OPH
const sent: { to: string; subject: string; text: string }[] = [];
const fakeMail = { send: async (m: any) => { sent.push(m); return true; } };
const stamp = Date.now();
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const DECL = { acceptAccuracy: true, acceptStatutes: true, acceptDataProcessing: true, signerName: 'Awa Koné', publicationConsent: true };

describe('Gestion des adhésions — personnel CAPH-CI (B4)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opts: { regionId: string; domainId: string; delegationId: string };
  let n = 0;
  const tempUsers: string[] = [];
  const createdOrgNames: string[] = [];
  const http = () => request(app.getHttpServer());
  const cache = new Map<string, string>();
  const tokenOf = async (email: string) => {
    if (!cache.has(email)) {
      const r = await http().post('/api/v1/auth/login').send({ email, password: DEMO });
      cache.set(email, r.body.accessToken as string);
    }
    return cache.get(email)!;
  };
  const as = async (email: string) => ({ Authorization: `Bearer ${await tokenOf(email)}` });
  const A = '/api/v1/admin/memberships';

  /** Dépose un dossier complet côté demandeur et retourne ses identifiants. */
  async function submitted(label: string, pres = `president-${label}-${stamp}@test.example`) {
    const e = `test-${label}-${stamp}-${n++}@test.example`;
    const d = (await http().post('/api/v1/memberships/requests').send({ categoryCode: 'PM_ORGANISATION', applicantName: 'Awa Koné', applicantEmail: e })).body;
    const name = `Association B4 ${label} ${stamp}`;
    createdOrgNames.push(name);
    await http().patch(`/api/v1/memberships/requests/${d.id}`).set('x-tracking-code', d.trackingCode).send({
      delegationId: opts.delegationId,
      data: {
        organization: {
          name, address: 'Rue des Jardins', regionId: opts.regionId, commune: 'Yopougon', interventionDomainIds: [opts.domainId],
          interventionZone: 'Abidjan', legalReference: `REC-B4-${label}-${stamp}`, phone: '+225 07 00 00 00 00', email: `contact-${label}-${stamp}@test.example`,
        },
        representative: { name: 'Awa Koné', function: 'Présidente', phone: '+225 07 11 11 11 11', email: pres },
        secretaryGeneral: { name: 'Koffi Yao', contact: '0700000000' },
        treasurer: { name: 'Fatou Diallo', contact: '0500000000' },
      },
    });
    for (const t of ['LEGAL_REGISTRATION', 'STATUTES', 'REPRESENTATIVE_ID']) {
      await http().post(`/api/v1/memberships/requests/${d.id}/documents`).set('x-tracking-code', d.trackingCode).field('type', t).attach('file', PDF, { filename: `${t}.pdf` });
    }
    const s = await http().post(`/api/v1/memberships/requests/${d.id}/submit`).set('x-tracking-code', d.trackingCode).send(DECL);
    expect(s.status).toBe(200);
    return { id: d.id as string, code: d.trackingCode as string, email: e, reference: s.body.reference as string, name, president: pres };
  }
  const detail = async (id: string) => (await http().get(`${A}/${id}`).set(await as(MANAGER))).body;
  const post = async (path: string, body: object = {}, who = MANAGER) => {
    const h = await as(who); // jeton obtenu AVANT de construire la requête
    return http().post(`${A}/${path}`).set(h).send(body);
  };
  const acceptAll = async (id: string) => {
    for (const d of (await detail(id)).documents) {
      expect((await http().patch(`${A}/${id}/documents/${d.id}`).set(await as(MANAGER)).send({ status: 'ACCEPTED' })).status).toBe(200);
    }
  };
  const DECISION = { outcome: 'ADMITTED', body: 'BOARD', decisionReference: `CA-${stamp}`, decidedAt: '2026-11-01' };
  /** Amène un dossier jusqu'à « admis, paiement en attente ». */
  async function admitted(label: string, pres?: string) {
    const r = await submitted(label, pres);
    expect((await post(`${r.id}/start-review`)).status).toBe(200);
    await acceptAll(r.id);
    expect((await post(`${r.id}/decision`, DECISION)).status).toBe(200);
    return r;
  }

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(MailService).useValue(fakeMail).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    const r = (await http().get('/api/v1/memberships/requirements')).body.options;
    opts = { regionId: r.regions[0].id, domainId: r.domains[0].id, delegationId: r.delegations[0].id };
    for (const e of [MANAGER, COMM, AWA]) await tokenOf(e);
  });

  afterAll(async () => {
    const reqs = await prisma.membershipRequest.findMany({ where: { applicantEmail: { endsWith: '@test.example' } }, select: { id: true, organizationId: true } });
    const ids = reqs.map((x) => x.id);
    const docs = await prisma.membershipDocument.findMany({ where: { requestId: { in: ids } }, select: { fileId: true } });
    await prisma.membershipEvent.deleteMany({ where: { requestId: { in: ids } } });
    await prisma.membershipDecision.deleteMany({ where: { requestId: { in: ids } } });
    await prisma.paymentRecord.deleteMany({ where: { requestId: { in: ids } } });
    await prisma.membershipDocument.deleteMany({ where: { requestId: { in: ids } } });
    await prisma.fileAsset.deleteMany({ where: { id: { in: docs.map((d) => d.fileId) } } });
    await prisma.membershipRequest.deleteMany({ where: { id: { in: ids } } });
    const orgs = await prisma.organization.findMany({ where: { name: { in: createdOrgNames } }, select: { id: true } });
    const orgIds = orgs.map((o) => o.id);
    const users = await prisma.organizationMember.findMany({ where: { organizationId: { in: orgIds } }, select: { userId: true } });
    const userIds = [...users.map((u) => u.userId)];
    await prisma.oneTimeToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.organizationMember.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    await prisma.user.deleteMany({ where: { OR: [{ id: { in: userIds } }, { email: { in: tempUsers } }] } });
    await prisma.paymentRecord.deleteMany({ where: { receiptNumber: { startsWith: `T${stamp}` } } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ actorLabel: { endsWith: '@test.example' } }, { metadata: { path: ['receiptNumber'], string_starts_with: `T${stamp}` } }] } });
    rmSync(process.env.STORAGE_DIR!, { recursive: true, force: true });
    await app.close();
  });

  describe('Accès', () => {
    it('refuse sans connexion, sans droit, et à un Président d’OPH', async () => {
      expect((await http().get(A)).status).toBe(401);
      expect((await http().get(A).set(await as(COMM))).status).toBe(403);
      expect((await http().get(A).set(await as(AWA))).status).toBe(403);
    });
    it('le gestionnaire voit la liste et les statistiques', async () => {
      const r = await submitted('liste');
      const list = await http().get(`${A}?limit=100`).set(await as(MANAGER));
      expect(list.status).toBe(200);
      const item = list.body.data.find((x: any) => x.id === r.id);
      expect(item.reference).toBe(r.reference);
      expect(item.organizationName).toBe(r.name);
      expect(item.statusLabel).toBeTruthy();
      expect(item.documents.total).toBe(3);
      const st = await http().get(`${A}/stats`).set(await as(MANAGER));
      expect(st.status).toBe(200);
      expect(st.body.byStatus.SUBMITTED).toBeGreaterThanOrEqual(1);
      expect(st.body.byStatus.DRAFT).toBeUndefined();
    });
    it('filtres : statut, recherche par nom/référence, dates', async () => {
      const r = await submitted('filtre');
      const byRef = await http().get(`${A}?q=${r.reference}`).set(await as(MANAGER));
      expect(byRef.body.data.map((x: any) => x.id)).toEqual([r.id]);
      const byName = await http().get(`${A}?q=${encodeURIComponent(`B4 filtre ${stamp}`)}&status=SUBMITTED`).set(await as(MANAGER));
      expect(byName.body.data.map((x: any) => x.id)).toEqual([r.id]);
      const none = await http().get(`${A}?q=${r.reference}&status=REJECTED`).set(await as(MANAGER));
      expect(none.body.data).toHaveLength(0);
      expect((await http().get(`${A}?status=NIMPORTE`).set(await as(MANAGER))).status).toBe(422);
    });
    it('les brouillons ne sont jamais visibles du personnel', async () => {
      const e = `test-brouillon-${stamp}@test.example`;
      const d = (await http().post('/api/v1/memberships/requests').send({ categoryCode: 'PM_ORGANISATION', applicantName: 'X Y', applicantEmail: e })).body;
      expect((await http().get(`${A}/${d.id}`).set(await as(MANAGER))).status).toBe(404);
    });
    it('un personnel limité à d’autres délégations ne voit pas le dossier', async () => {
      const r = await submitted('scope');
      const other = await prisma.delegation.create({ data: { name: `Délégation test ${stamp}` } });
      const role = await prisma.role.findUniqueOrThrow({ where: { code: 'MEMBERSHIP_MANAGER' } });
      const email = `scope-${stamp}@test.example`;
      tempUsers.push(email);
      const u = await prisma.user.create({ data: { email, firstName: 'Scope', lastName: 'Test', status: 'ACTIVE', passwordHash: await hashPassword(DEMO) } });
      await prisma.userRole.create({ data: { userId: u.id, roleId: role.id, delegationId: other.id } as any });
      const h = await as(email);
      expect((await http().get(`${A}/${r.id}`).set(h)).status).toBe(404);
      const list = await http().get(`${A}?limit=100`).set(h);
      expect(list.body.data.find((x: any) => x.id === r.id)).toBeUndefined();
      await prisma.userRole.deleteMany({ where: { userId: u.id } });
      await prisma.user.delete({ where: { id: u.id } });
      await prisma.delegation.delete({ where: { id: other.id } });
    });
  });

  describe('Détail et pièces', () => {
    it('détail complet avec barème, historique et actions possibles', async () => {
      const r = await submitted('detail');
      const d = await detail(r.id);
      expect(d.reference).toBe(r.reference);
      expect(d.data.organization.name).toBe(r.name);
      expect(d.documents).toHaveLength(3);
      expect(d.feesDue.totalFcfa).toBe(25000 + 2000 + 5000);
      expect(d.events.map((e: any) => e.action)).toContain('SUBMIT');
      expect(d.allowedActions.startReview).toBe(true);
      expect(d.allowedActions.decide).toBe(false);
      expect(d.declarations.publicationConsent).toBe(true);
    });
    it('téléchargement d’une pièce : contenu exact, en-têtes sûrs, lecture tracée', async () => {
      const r = await submitted('dl');
      const doc = (await detail(r.id)).documents.find((x: any) => x.type === 'REPRESENTATIVE_ID');
      expect(doc.file.encrypted).toBe(true); // clé de chiffrement active en test
      const res = await http().get(`${A}/${r.id}/documents/${doc.id}/file`).set(await as(MANAGER)).buffer(true).parse((rs, cb) => {
        const c: Buffer[] = []; rs.on('data', (x: Buffer) => c.push(x)); rs.on('end', () => cb(null, Buffer.concat(c)));
      });
      expect(res.status).toBe(200);
      expect(Buffer.compare(res.body, PDF)).toBe(0);
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      const log = await prisma.auditLog.findFirst({ where: { action: 'membership.document.downloaded', entityId: r.id } });
      expect(log).toBeTruthy();
      // un lecteur sans droit d'examen ne peut pas télécharger
      const dm = await prisma.user.findUniqueOrThrow({ where: { email: 'gestionnaire@caphci.local' } });
      expect(dm).toBeTruthy();
      expect((await http().get(`${A}/${r.id}/documents/${doc.id}/file`).set(await as(COMM))).status).toBe(403);
    });
    it('refuser une pièce exige un motif, visible ensuite du demandeur', async () => {
      const r = await submitted('doc');
      await post(`${r.id}/start-review`);
      const doc = (await detail(r.id)).documents[0];
      const h = await as(MANAGER);
      expect((await http().patch(`${A}/${r.id}/documents/${doc.id}`).set(h).send({ status: 'REJECTED' })).status).toBe(422);
      const ok = await http().patch(`${A}/${r.id}/documents/${doc.id}`).set(h).send({ status: 'REJECTED', note: 'Scan illisible' });
      expect(ok.status).toBe(200);
      const t = await http().post('/api/v1/memberships/track').send({ reference: r.reference, email: r.email, code: r.code });
      expect(t.body.documents.some((x: any) => x.status === 'REJECTED' && x.note === 'Scan illisible')).toBe(true);
    });
  });

  describe('Instruction et compléments', () => {
    it('commencer l’examen puis demander des compléments : message visible, e-mail envoyé, demandeur peut corriger', async () => {
      const r = await submitted('info');
      expect((await post(`${r.id}/start-review`)).body.status).toBe('UNDER_REVIEW');
      expect((await post(`${r.id}/request-info`, { message: 'court' })).status).toBe(422);
      const ri = await post(`${r.id}/request-info`, { message: 'Merci de fournir un récépissé lisible et à jour.' });
      expect(ri.status).toBe(200);
      expect(ri.body.status).toBe('TO_COMPLETE');
      expect(sent.some((m) => m.to === r.email && m.text.includes('récépissé lisible'))).toBe(true);
      const t = await http().post('/api/v1/memberships/track').send({ reference: r.reference, email: r.email, code: r.code });
      expect(t.body.status).toBe('TO_COMPLETE');
      expect(t.body.canEdit).toBe(true);
      expect(t.body.messages.some((m: any) => m.text.includes('récépissé lisible'))).toBe(true);
      // le demandeur renvoie son dossier → de nouveau « reçu »
      const rs = await http().post(`/api/v1/memberships/requests/${r.id}/submit`).set('x-tracking-code', r.code).send(DECL);
      expect(rs.status).toBe(200);
      expect((await detail(r.id)).status).toBe('SUBMITTED');
    });
    it('rattache le dossier à une délégation', async () => {
      const r = await submitted('deleg');
      const dg = await prisma.delegation.findFirstOrThrow({ where: { id: { not: opts.delegationId } } });
      const res = await http().patch(`${A}/${r.id}/delegation`).set(await as(MANAGER)).send({ delegationId: dg.id, reason: 'Résidence du président' });
      expect(res.status).toBe(200);
      expect((await detail(r.id)).delegation.id).toBe(dg.id);
      expect((await http().patch(`${A}/${r.id}/delegation`).set(await as(MANAGER)).send({ delegationId: '00000000-0000-4000-8000-000000000000' })).status).toBe(422);
    });
    it('les transitions interdites sont refusées (409)', async () => {
      const r = await submitted('transitions');
      expect((await post(`${r.id}/decision`, DECISION)).status).toBe(409); // pas encore en examen
      expect((await post(`${r.id}/payment`, { method: 'CASH', receiptNumber: `T${stamp}-x` })).status).toBe(409);
      expect((await post(`${r.id}/register`)).status).toBe(409);
      await post(`${r.id}/start-review`);
      expect((await post(`${r.id}/start-review`)).status).toBe(409);
    });
  });

  describe('Décision', () => {
    it('réservée aux personnes habilitées', async () => {
      const r = await submitted('perm');
      await post(`${r.id}/start-review`);
      const role = await prisma.role.findUniqueOrThrow({ where: { code: 'MEMBERSHIP_MANAGER' } });
      const email = `onlymgr-${stamp}@test.example`;
      tempUsers.push(email);
      const u = await prisma.user.create({ data: { email, firstName: 'Seul', lastName: 'Gestionnaire', status: 'ACTIVE', passwordHash: await hashPassword(DEMO) } });
      await prisma.userRole.create({ data: { userId: u.id, roleId: role.id } as any });
      expect((await post(`${r.id}/decision`, DECISION, email)).status).toBe(403);
      await prisma.userRole.deleteMany({ where: { userId: u.id } });
      await prisma.user.delete({ where: { id: u.id } });
    });
    it('admission impossible tant que les pièces obligatoires ne sont pas validées', async () => {
      const r = await submitted('nodocs');
      await post(`${r.id}/start-review`);
      const res = await post(`${r.id}/decision`, DECISION);
      expect(res.status).toBe(409);
      expect(res.body.code ?? res.body.error?.code).toBe('DOCUMENTS_NOT_VALIDATED');
    });
    it('motif obligatoire pour un refus ou un ajournement ; date future refusée', async () => {
      const r = await submitted('motif');
      await post(`${r.id}/start-review`);
      expect((await post(`${r.id}/decision`, { ...DECISION, outcome: 'REJECTED' })).status).toBe(422);
      expect((await post(`${r.id}/decision`, { ...DECISION, outcome: 'ADJOURNED' })).status).toBe(422);
      expect((await post(`${r.id}/decision`, { ...DECISION, decidedAt: '2099-01-01' })).status).toBe(422);
      expect((await post(`${r.id}/decision`, { ...DECISION, body: 'AUTRE' })).status).toBe(422);
    });
    it('refus : motif visible du demandeur, décision historisée, statut final', async () => {
      const r = await submitted('refus');
      await post(`${r.id}/start-review`);
      const res = await post(`${r.id}/decision`, { ...DECISION, outcome: 'REJECTED', motive: 'Activité hors du champ du handicap.' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('REJECTED');
      const t = await http().post('/api/v1/memberships/track').send({ reference: r.reference, email: r.email, code: r.code });
      expect(t.body.decision.outcome).toBe('REJECTED');
      expect(t.body.decision.motive).toContain('hors du champ');
      const d = await detail(r.id);
      expect(d.decisions[0].decisionReference).toBe(DECISION.decisionReference);
      expect(d.decisions[0].recordedBy).toBeTruthy();
      expect(sent.some((m) => m.to === r.email && m.text.includes('hors du champ'))).toBe(true);
      expect((await post(`${r.id}/start-review`)).status).toBe(409); // un refus est définitif
    });
    it('ajournement : le dossier peut être rouvert pour un nouvel examen', async () => {
      const r = await submitted('ajourne');
      await post(`${r.id}/start-review`);
      expect((await post(`${r.id}/decision`, { ...DECISION, outcome: 'ADJOURNED', motive: 'Statuts à régulariser.' })).body.status).toBe('ADJOURNED');
      expect((await post(`${r.id}/start-review`)).body.status).toBe('UNDER_REVIEW');
    });
  });

  describe('Paiement et enregistrement', () => {
    it('parcours complet : admission → paiement → enregistrement (organisation + Président invité)', async () => {
      const r = await admitted('complet');
      expect((await detail(r.id)).status).toBe('ADMITTED_PAYMENT_PENDING');
      expect((await post(`${r.id}/register`)).status).toBe(409); // paiement requis d'abord

      const pay = await post(`${r.id}/payment`, { method: 'MOBILE_MONEY', receiptNumber: `T${stamp}-1`, totalFcfa: 1 } as any);
      expect(pay.status).toBe(422); // champ inconnu : le total ne se saisit pas
      const ok = await post(`${r.id}/payment`, { method: 'MOBILE_MONEY', receiptNumber: `T${stamp}-1` });
      expect(ok.status).toBe(201);
      expect(ok.body.totalFcfa).toBe(32000); // 25 000 + 2 000 + 5 000, calculé depuis le barème
      expect((await post(`${r.id}/payment`, { method: 'CASH', receiptNumber: `T${stamp}-2` })).status).toBe(409);

      const reg = await post(`${r.id}/register`);
      expect(reg.status).toBe(201);
      expect(reg.body.status).toBe('REGISTERED');
      expect(reg.body.organization.memberNumber).toMatch(/^OPH-\d{4,}$/);
      expect(reg.body.president.email).toBe(r.president);

      const org = await prisma.organization.findUniqueOrThrow({ where: { id: reg.body.organization.id }, include: { domains: true, members: { include: { role: true, user: true } } } });
      expect(org.status).toBe('ACTIVE');
      expect(org.name).toBe(r.name);
      expect(org.isListed).toBe(true);
      expect(org.publicationConsentAt).toBeTruthy();
      expect(org.domains).toHaveLength(1);
      expect(org.members).toHaveLength(1);
      expect(org.members[0].role.code).toBe('OPH_PRESIDENT');
      expect(org.members[0].user.status).toBe('INVITED');
      expect(sent.some((m) => m.to === r.president && m.subject.includes('Activez votre compte'))).toBe(true);
      expect(sent.some((m) => m.to === r.email && m.text.includes(reg.body.organization.memberNumber))).toBe(true);

      const d = await detail(r.id);
      expect(d.status).toBe('REGISTERED');
      expect(d.organizationId).toBe(org.id);
      expect(d.events.map((e: any) => e.action)).toEqual(expect.arrayContaining(['SUBMIT', 'START_REVIEW', 'DECISION', 'PAYMENT', 'REGISTER']));
      expect((await post(`${r.id}/register`)).status).toBe(409); // une seule fois

      // le Président peut ensuite activer son compte et voir son OPH (via le jeton d'invitation)
      const link = sent.filter((m) => m.to === r.president && m.subject.includes('Activez')).pop()!.text.match(/token=([\w-]+)/)![1];
      const act = await http().post('/api/v1/auth/accept-invitation').send({ token: link, newPassword: 'Nouveau-MotDePasse!2026' });
      expect([200, 201, 204]).toContain(act.status);
    });
    it('les numéros de membre se suivent sans doublon', async () => {
      const [a, b] = [await admitted('num1'), await admitted('num2')];
      const nums: string[] = [];
      for (const r of [a, b]) {
        expect((await post(`${r.id}/payment`, { method: 'CASH', receiptNumber: `T${stamp}-${r.id.slice(0, 6)}` })).status).toBe(201);
        nums.push((await post(`${r.id}/register`)).body.organization.memberNumber);
      }
      expect(new Set(nums).size).toBe(2);
    });
    it('numéro de reçu déjà utilisé → 409 ; ligne de barème non applicable → 422', async () => {
      const [a, b] = [await admitted('recu1'), await admitted('recu2')];
      expect((await post(`${a.id}/payment`, { method: 'CASH', receiptNumber: `T${stamp}-dup` })).status).toBe(201);
      expect((await post(`${b.id}/payment`, { method: 'CASH', receiptNumber: `T${stamp}-dup` })).status).toBe(409);
      expect((await post(`${b.id}/payment`, { method: 'CASH', receiptNumber: `T${stamp}-ok`, feeCodes: ['ADHESION_PP'] })).status).toBe(422);
      expect((await post(`${b.id}/payment`, { method: 'CASH', receiptNumber: `T${stamp}-ok2`, feeCodes: ['ADHESION_PM'] })).body.totalFcfa).toBe(25000);
    });
    it('e-mail du Président déjà utilisé → 409 avec possibilité d’en indiquer un autre', async () => {
      const r = await admitted('emailpris', AWA);
      await post(`${r.id}/payment`, { method: 'CASH', receiptNumber: `T${stamp}-em` });
      const bad = await post(`${r.id}/register`);
      expect(bad.status).toBe(409);
      expect((await detail(r.id)).status).toBe('ADMITTED_PAYMENT_PENDING'); // rien n'a été créé
      const alt = `autre-pres-${stamp}@test.example`;
      const ok = await post(`${r.id}/register`, { presidentEmail: alt });
      expect(ok.status).toBe(201);
      expect(ok.body.president.email).toBe(alt);
    });
    it('un OPH enregistré apparaît dans l’annuaire public grâce au consentement', async () => {
      const r = await admitted('annuaire');
      await post(`${r.id}/payment`, { method: 'CASH', receiptNumber: `T${stamp}-an` });
      await post(`${r.id}/register`);
      const dir = await http().get(`/api/v1/directory/organizations?q=${encodeURIComponent(r.name)}`);
      expect(dir.status).toBe(200);
      expect(JSON.stringify(dir.body)).toContain(r.name);
      expect(JSON.stringify(dir.body)).not.toContain(r.president); // aucune donnée privée
    });
  });
});
