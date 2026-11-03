import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';
import { MembershipsService } from '../src/memberships/memberships.service';
import { PrismaService } from '../src/prisma/prisma.service';

/** Tests du lot B3 : parcours d'adhésion côté demandeur. */
const sent: { to: string; subject: string; text: string }[] = [];
const fakeMail = { send: async (m: any) => { sent.push(m); return true; } };
const stamp = Date.now();
const REF = /^CAPH-\d{4}-\d{6}$/;
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
const DECL = { acceptAccuracy: true, acceptStatutes: true, acceptDataProcessing: true, signerName: 'Awa Koné' };

describe('Parcours d’adhésion — demandeur (B3)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let opts: { regionId: string; domainId: string; delegationId: string };
  let n = 0;
  const http = () => request(app.getHttpServer());
  const email = (l: string) => `test-${l}-${stamp}-${n++}@test.example`;

  const newDraft = async (e = email('d')) => {
    const r = await http().post('/api/v1/memberships/requests').send({ categoryCode: 'PM_ORGANISATION', applicantName: 'Awa Koné', applicantEmail: e });
    expect(r.status).toBe(201);
    return { id: r.body.id as string, code: r.body.trackingCode as string, email: e };
  };
  const orgData = (name: string, legal: string) => ({
    organization: {
      name, address: 'Rue des Jardins, Yopougon', regionId: opts.regionId, commune: 'Yopougon',
      interventionDomainIds: [opts.domainId], interventionZone: 'District d’Abidjan', legalReference: legal,
      phone: '+225 07 00 00 00 00', email: 'contact@association-test.example',
    },
    representative: { name: 'Awa Koné', function: 'Présidente', phone: '+225 07 11 11 11 11', email: 'awa@association-test.example' },
    secretaryGeneral: { name: 'Koffi Yao', contact: '0700000000' },
    treasurer: { name: 'Fatou Diallo', contact: '0500000000' },
  });
  const patch = (d: { id: string; code: string }, body: object) =>
    http().patch(`/api/v1/memberships/requests/${d.id}`).set('x-tracking-code', d.code).send(body);
  const upload = (d: { id: string; code: string }, type: string, buf: Buffer, filename = 'piece.pdf') =>
    http().post(`/api/v1/memberships/requests/${d.id}/documents`).set('x-tracking-code', d.code)
      .field('type', type).attach('file', buf, { filename });
  const submit = (d: { id: string; code: string }, body: object = DECL) =>
    http().post(`/api/v1/memberships/requests/${d.id}/submit`).set('x-tracking-code', d.code).send(body);
  const track = (reference: string, e: string, code: string) =>
    http().post('/api/v1/memberships/track').send({ reference, email: e, code });

  /** Dossier complet prêt à soumettre. */
  async function completeDraft(label: string, orgName = `Association Test ${label} ${stamp}`, legal = `REC-${label}-${stamp}`) {
    const d = await newDraft(email(label));
    expect((await patch(d, { delegationId: opts.delegationId, data: orgData(orgName, legal) })).status).toBe(200);
    for (const t of ['LEGAL_REGISTRATION', 'STATUTES', 'REPRESENTATIVE_ID']) expect((await upload(d, t, PDF)).status).toBe(201);
    return { ...d, orgName, legal };
  }

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(MailService).useValue(fakeMail).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    const r = (await http().get('/api/v1/memberships/requirements')).body.options;
    opts = { regionId: r.regions[0].id, domainId: r.domains[0].id, delegationId: r.delegations[0].id };
  });

  afterAll(async () => {
    const reqs = await prisma.membershipRequest.findMany({ where: { applicantEmail: { endsWith: `@test.example` } }, select: { id: true } });
    const ids = reqs.map((x) => x.id);
    const docs = await prisma.membershipDocument.findMany({ where: { requestId: { in: ids } }, select: { fileId: true } });
    await prisma.membershipEvent.deleteMany({ where: { requestId: { in: ids } } });
    await prisma.membershipDecision.deleteMany({ where: { requestId: { in: ids } } });
    await prisma.membershipDocument.deleteMany({ where: { requestId: { in: ids } } });
    await prisma.fileAsset.deleteMany({ where: { id: { in: docs.map((d) => d.fileId) } } });
    await prisma.membershipRequest.deleteMany({ where: { id: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { actorLabel: { endsWith: '@test.example' } } });
    rmSync(process.env.STORAGE_DIR!, { recursive: true, force: true });
    await app.close();
  });

  describe('Informations publiques', () => {
    it('seule la catégorie « Organisation » est ouverte', async () => {
      const r = await http().get('/api/v1/memberships/categories');
      expect(r.status).toBe(200);
      expect(r.body.find((c: any) => c.code === 'PM_ORGANISATION').isOpen).toBe(true);
      expect(r.body.filter((c: any) => c.isOpen)).toHaveLength(1);
    });
    it('conditions, critères, pièces, barème et listes de choix', async () => {
      const r = await http().get('/api/v1/memberships/requirements?category=PM_ORGANISATION');
      expect(r.status).toBe(200);
      expect(r.body.documents.filter((d: any) => d.requirement === 'REQUIRED').map((d: any) => d.type).sort())
        .toEqual(['LEGAL_REGISTRATION', 'REPRESENTATIVE_ID', 'STATUTES']);
      expect(r.body.fees.some((f: any) => f.code === 'ADHESION_PM' && f.amountFcfa === 25000)).toBe(true);
      expect(r.body.eligibility.criteria.length).toBeGreaterThan(0);
      expect(r.body.options.delegations.length).toBeGreaterThan(0);
      expect((await http().get('/api/v1/memberships/requirements?category=INCONNUE')).status).toBe(404);
    });
  });

  describe('Brouillon et accès par code de suivi', () => {
    it('crée un brouillon, envoie le code par e-mail, refuse une catégorie fermée', async () => {
      const e = email('create');
      const d = await newDraft(e);
      expect(d.code.length).toBeGreaterThan(30);
      expect(sent.some((m) => m.to === e && m.text.includes(d.code))).toBe(true);
      const closed = await http().post('/api/v1/memberships/requests').send({ categoryCode: 'PP_DISABLED_PERSON', applicantName: 'X Y', applicantEmail: email('c') });
      expect(closed.status).toBe(422);
      expect(closed.body.code).toBe('CATEGORY_CLOSED');
      expect((await http().post('/api/v1/memberships/requests').send({ categoryCode: 'PM_ORGANISATION', applicantName: 'X Y', applicantEmail: 'pas-un-email' })).status).toBe(422);
    });
    it('un dossier n’est lisible QU’avec son propre code (404 sinon, sans révéler son existence)', async () => {
      const a = await newDraft();
      const b = await newDraft();
      const url = `/api/v1/memberships/requests/${a.id}`;
      expect((await http().get(url)).status).toBe(404);
      expect((await http().get(url).set('x-tracking-code', 'code-incorrect-code-incorrect-code')).status).toBe(404);
      expect((await http().get(url).set('x-tracking-code', b.code)).status).toBe(404); // le code d'un AUTRE dossier
      const ok = await http().get(url).set('x-tracking-code', a.code);
      expect(ok.status).toBe(200);
      expect(ok.body.completeness.complete).toBe(false);
      expect(JSON.stringify(ok.body)).not.toMatch(/trackingTokenHash/);
      // modification et dépôt de pièce avec le code d'un autre : refusés
      expect((await patch({ id: a.id, code: b.code }, { applicantName: 'Pirate' })).status).toBe(404);
      expect((await upload({ id: a.id, code: b.code }, 'STATUTES', PDF)).status).toBe(404);
    });
    it('limite à 5 brouillons par adresse e-mail', async () => {
      const e = email('many');
      for (let i = 0; i < 5; i++) await newDraft(e);
      const r = await http().post('/api/v1/memberships/requests').send({ categoryCode: 'PM_ORGANISATION', applicantName: 'X Y', applicantEmail: e });
      expect(r.status).toBe(409);
      expect(r.body.code).toBe('TOO_MANY_DRAFTS');
    });
  });

  describe('Formulaire', () => {
    it('enregistre par morceaux, fusionne, efface avec "" et garde la saisie', async () => {
      const d = await newDraft();
      let r = await patch(d, { data: { organization: { name: 'Association Espoir', commune: 'Yopougon' } } });
      expect(r.status).toBe(200);
      r = await patch(d, { data: { organization: { acronym: 'AE' }, representative: { name: 'Awa Koné' } } });
      expect(r.body.data.organization).toMatchObject({ name: 'Association Espoir', commune: 'Yopougon', acronym: 'AE' });
      r = await patch(d, { data: { organization: { acronym: '' } } });
      expect(r.body.data.organization.acronym).toBeUndefined();
      expect(r.body.data.organization.name).toBe('Association Espoir');
    });
    it('refuse les erreurs avec un message par champ (422) et ne modifie rien', async () => {
      const d = await newDraft();
      const bad = await patch(d, { data: { organization: { email: 'pas-un-email', phone: 'abc', regionId: '00000000-0000-4000-8000-000000000000', inconnu: 'x' }, pirate: { a: 1 } } });
      expect(bad.status).toBe(422);
      const fields = bad.body.details.map((x: any) => x.field);
      expect(fields).toEqual(expect.arrayContaining(['organization.email', 'organization.phone', 'organization.regionId', 'organization.inconnu', 'pirate']));
      expect((await http().get(`/api/v1/memberships/requests/${d.id}`).set('x-tracking-code', d.code)).body.data).toEqual({});
      expect((await patch(d, { status: 'REGISTERED' })).status).toBe(422);   // champs hors liste blanche
      expect((await patch(d, { reference: 'CAPH-2026-000001' })).status).toBe(422);
    });
  });

  describe('Pièces jointes', () => {
    it('accepte PDF et PNG ; chiffre la pièce d’identité au repos ; le nom est nettoyé', async () => {
      const d = await newDraft();
      const ok = await upload(d, 'LEGAL_REGISTRATION', PNG, '../../etc/<script>récépissé.png');
      expect(ok.status).toBe(201);
      expect(ok.body.mimeType).toBe('image/png');
      expect(ok.body.originalName).not.toMatch(/[/<>]/);
      const id = await upload(d, 'REPRESENTATIVE_ID', PDF, 'identite.pdf');
      expect(id.status).toBe(201);
      const asset = await prisma.fileAsset.findFirstOrThrow({ where: { membershipDocuments: { some: { id: id.body.id } } } });
      expect(asset.encrypted).toBe(true);
      const onDisk = readFileSync(join(process.env.STORAGE_DIR!, asset.storageKey.slice(0, 2), asset.storageKey));
      expect(onDisk.subarray(0, 5).toString()).not.toBe('%PDF-');
      expect(onDisk.includes(Buffer.from('trailer'))).toBe(false);
      const plain = await prisma.fileAsset.findFirstOrThrow({ where: { membershipDocuments: { some: { id: ok.body.id } } } });
      expect(plain.encrypted).toBe(false);
    });
    it('refuse un fichier déguisé (.exe, texte, HTML renommés en .pdf) d’après son CONTENU', async () => {
      const d = await newDraft();
      for (const bad of [Buffer.from('MZ\x90\x00 programme windows'), Buffer.from('<html><script>alert(1)</script></html>'), Buffer.from('juste du texte')]) {
        const r = await upload(d, 'STATUTES', bad, 'statuts.pdf');
        expect(r.status).toBe(422);
        expect(r.body.code).toBe('INVALID_FILE_TYPE');
      }
    });
    it('refuse un fichier trop lourd (> 10 Mo), un type inattendu et la pièce « après admission »', async () => {
      const d = await newDraft();
      const big = Buffer.concat([PDF, Buffer.alloc(10 * 1024 * 1024)]);
      expect((await upload(d, 'STATUTES', big)).status).toBe(413);
      expect((await upload(d, 'TYPE_INCONNU', PDF)).body.code).toBe('INVALID_DOCUMENT_TYPE');
      expect((await upload(d, 'PAYMENT_PROOF', PDF)).body.code).toBe('INVALID_DOCUMENT_TYPE');
      const noFile = await http().post(`/api/v1/memberships/requests/${d.id}/documents`).set('x-tracking-code', d.code).field('type', 'STATUTES');
      expect(noFile.status).toBe(422);
    });
    it('3 fichiers maximum par type ; suppression possible ; pièces rattachées au bon dossier', async () => {
      const a = await newDraft();
      const b = await newDraft();
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) ids.push((await upload(a, 'STATUTES', PDF)).body.id);
      expect((await upload(a, 'STATUTES', PDF)).body.code).toBe('TOO_MANY_FILES');
      expect((await http().delete(`/api/v1/memberships/requests/${a.id}/documents/${ids[0]}`).set('x-tracking-code', b.code)).status).toBe(404);
      expect((await http().delete(`/api/v1/memberships/requests/${a.id}/documents/${ids[0]}`).set('x-tracking-code', a.code)).status).toBe(204);
      const asset = await prisma.membershipDocument.findUniqueOrThrow({ where: { id: ids[0] }, include: { file: true } });
      expect(asset.deletedAt).not.toBeNull();
      expect(existsSync(join(process.env.STORAGE_DIR!, asset.file.storageKey.slice(0, 2), asset.file.storageKey))).toBe(false);
      expect((await http().get(`/api/v1/memberships/requests/${a.id}`).set('x-tracking-code', a.code)).body.documents).toHaveLength(2);
      expect((await http().get(`/api/v1/memberships/requests/${b.id}`).set('x-tracking-code', b.code)).body.documents).toHaveLength(0);
    });
  });

  describe('Soumission, référence et suivi', () => {
    it('refuse un dossier incomplet en listant ce qui manque, et exige les 3 déclarations', async () => {
      const d = await newDraft();
      const r = await submit(d);
      expect(r.status).toBe(422);
      expect(r.body.code).toBe('INCOMPLETE_REQUEST');
      expect(r.body.details.map((x: any) => x.field)).toEqual(expect.arrayContaining(['organization.name', 'delegationId', 'documents.STATUTES']));
      const c = await completeDraft('decl');
      expect((await submit(c, { ...DECL, acceptStatutes: false })).status).toBe(422);
      expect((await submit(c, { acceptAccuracy: true })).status).toBe(422);
    });

    it('dépose le dossier : référence générée, statut « reçu » (JAMAIS admis), e-mail de confirmation', async () => {
      const c = await completeDraft('ok');
      const r = await submit(c);
      expect(r.status).toBe(200);
      expect(r.body.reference).toMatch(REF);
      expect(r.body.status).toBe('SUBMITTED');
      const row = await prisma.membershipRequest.findUniqueOrThrow({ where: { id: c.id }, include: { events: true } });
      expect(row.status).toBe('SUBMITTED');
      expect(row.organizationId).toBeNull();                        // aucune organisation créée automatiquement
      expect(await prisma.organization.count({ where: { name: c.orgName } })).toBe(0);
      expect(row.signerName).toBe('Awa Koné');
      expect(row.events.map((e) => e.action)).toEqual(expect.arrayContaining(['CREATE', 'SUBMIT']));
      const mail = sent.find((m) => m.to === c.email && m.subject.includes(r.body.reference))!;
      expect(mail.text).toContain(c.code);
      expect(mail.text).toMatch(/ne vaut pas admission/);
    });

    it('un dossier déposé n’est plus modifiable (409)', async () => {
      const c = await completeDraft('lock');
      await submit(c);
      expect((await patch(c, { applicantName: 'Autre' })).body.code).toBe('NOT_EDITABLE');
      expect((await upload(c, 'STATUTES', PDF)).status).toBe(409);
      expect((await submit(c)).status).toBe(409);
    });

    it('RÉFÉRENCES UNIQUES même avec 6 dépôts simultanés', async () => {
      const drafts = [];
      for (let i = 0; i < 6; i++) drafts.push(await completeDraft(`par${i}`));
      const results = await Promise.all(drafts.map((d) => submit(d)));
      expect(results.every((r) => r.status === 200)).toBe(true);
      const refs = results.map((r) => r.body.reference);
      expect(new Set(refs).size).toBe(6);
      refs.forEach((r) => expect(r).toMatch(REF));
    });

    it('refuse un doublon : dossier déjà ouvert, ou organisation déjà membre', async () => {
      const first = await completeDraft('dup');
      expect((await submit(first)).status).toBe(200);
      const same = await completeDraft('dup2', first.orgName.toUpperCase(), `AUTRE-${stamp}`);
      const r = await submit(same);
      expect(r.status).toBe(409);
      expect(r.body.code).toBe('DUPLICATE_REQUEST');
      const sameLegal = await completeDraft('dup3', `Nom différent ${stamp}`, first.legal.toLowerCase());
      expect((await submit(sameLegal)).body.code).toBe('DUPLICATE_REQUEST');
      const member = await completeDraft('mem', 'Association Horizon Inclusif', `X-${stamp}`);
      expect((await submit(member)).body.code).toBe('ALREADY_MEMBER');
    });

    it('un renouvellement exige le n° de membre', async () => {
      const c = await completeDraft('ren');
      await patch(c, { requestType: 'RENEWAL' });
      const r = await submit(c);
      expect(r.status).toBe(422);
      expect(r.body.details.map((x: any) => x.field)).toContain('existingMemberNumber');
    });

    it('suivi : statut et rien d’autre ; réponse identique pour référence inconnue, mauvais e-mail ou mauvais code', async () => {
      const c = await completeDraft('trk');
      const { reference } = (await submit(c)).body;
      const ok = await track(reference, c.email, c.code);
      expect(ok.status).toBe(200);
      expect(ok.body.status).toBe('SUBMITTED');
      expect(ok.body.statusLabel).toBe('Dossier reçu');
      expect(ok.body.decision).toBeNull();
      const json = JSON.stringify(ok.body);
      for (const secret of [c.orgName, c.legal, 'Rue des Jardins', 'association-test.example', '+225 07', c.email, 'Koffi Yao', 'trackingTokenHash', 'storageKey']) {
        expect(json).not.toContain(secret);
      }
      const bads = [
        await track('CAPH-2020-999999', c.email, c.code),
        await track(reference, `autre-${c.email}`, c.code),
        await track(reference, c.email, 'x'.repeat(40)),
        await track(reference, c.email, (await newDraft()).code),
      ];
      bads.forEach((b) => { expect(b.status).toBe(404); expect(b.body).toEqual(bads[0].body); });
      expect((await track('format-invalide', c.email, c.code)).status).toBe(422);
    });

    it('compléments : le demandeur voit le message de l’équipe, complète, et garde la MÊME référence', async () => {
      const c = await completeDraft('cmp');
      const { reference } = (await submit(c)).body;
      // Simule l'action de la CAPH-CI (lot B4) : demande de complément
      await prisma.membershipRequest.update({ where: { id: c.id }, data: { status: 'TO_COMPLETE' } });
      await prisma.membershipEvent.create({ data: { requestId: c.id, actorType: 'STAFF', action: 'REQUEST_INFO', fromStatus: 'SUBMITTED', toStatus: 'TO_COMPLETE', comment: 'Merci de joindre un récépissé lisible.' } });
      await prisma.membershipEvent.create({ data: { requestId: c.id, actorType: 'STAFF', action: 'INTERNAL_NOTE', comment: 'NOTE INTERNE CONFIDENTIELLE' } });
      const t = await track(reference, c.email, c.code);
      expect(t.body.status).toBe('TO_COMPLETE');
      expect(t.body.canEdit).toBe(true);
      expect(t.body.messages.map((m: any) => m.text)).toEqual(['Merci de joindre un récépissé lisible.']);
      expect(JSON.stringify(t.body)).not.toContain('NOTE INTERNE');
      expect((await upload(c, 'LEGAL_REGISTRATION', PDF, 'nouveau.pdf')).status).toBe(201);
      const again = await submit(c);
      expect(again.status).toBe(200);
      expect(again.body.reference).toBe(reference);
      const row = await prisma.membershipRequest.findUniqueOrThrow({ where: { id: c.id }, include: { events: true } });
      expect(row.status).toBe('SUBMITTED');
      expect(row.events.some((e) => e.action === 'RESUBMIT')).toBe(true);
    });

    it('la décision enregistrée par la CAPH-CI est visible dans le suivi', async () => {
      const c = await completeDraft('dec');
      const { reference } = (await submit(c)).body;
      const staff = await prisma.user.findUniqueOrThrow({ where: { email: 'gestionnaire@caphci.local' } });
      await prisma.membershipRequest.update({ where: { id: c.id }, data: { status: 'ADJOURNED' } });
      await prisma.membershipDecision.create({ data: { requestId: c.id, outcome: 'ADJOURNED', body: 'BOARD', decisionReference: 'CA-TEST-1', decidedAt: new Date(), motive: 'Statuts à régulariser', recordedById: staff.id } });
      const t = await track(reference, c.email, c.code);
      expect(t.body.decision).toMatchObject({ outcome: 'ADJOURNED', outcomeLabel: 'Ajourné', motive: 'Statuts à régulariser' });
      expect(JSON.stringify(t.body)).not.toContain('CA-TEST-1');
    });

    it('retrait de la demande', async () => {
      const c = await completeDraft('wd');
      const r = await http().post(`/api/v1/memberships/requests/${c.id}/withdraw`).set('x-tracking-code', c.code);
      expect(r.status).toBe(200);
      expect(r.body.status).toBe('WITHDRAWN');
      expect((await patch(c, { applicantName: 'X Y' })).status).toBe(409);
    });
  });

  describe('Nettoyage des brouillons', () => {
    it('efface les brouillons inactifs depuis plus de 30 jours (données + fichiers), pas les autres', async () => {
      const old = await newDraft();
      const fresh = await newDraft();
      await patch(old, { data: { organization: { name: 'À effacer' } } });
      const doc = await upload(old, 'STATUTES', PDF);
      const asset = await prisma.membershipDocument.findUniqueOrThrow({ where: { id: doc.body.id }, include: { file: true } });
      const path = join(process.env.STORAGE_DIR!, asset.file.storageKey.slice(0, 2), asset.file.storageKey);
      expect(existsSync(path)).toBe(true);
      await prisma.membershipRequest.update({ where: { id: old.id }, data: { lastActionAt: new Date(Date.now() - 31 * 86_400_000) } });
      const count = await app.get(MembershipsService).purgeExpiredDrafts();
      expect(count).toBeGreaterThanOrEqual(1);
      const o = await prisma.membershipRequest.findUniqueOrThrow({ where: { id: old.id } });
      expect(o.status).toBe('WITHDRAWN');
      expect(o.data).toEqual({});
      expect(existsSync(path)).toBe(false);
      expect((await prisma.membershipRequest.findUniqueOrThrow({ where: { id: fresh.id } })).status).toBe('DRAFT');
    });
  });
});
