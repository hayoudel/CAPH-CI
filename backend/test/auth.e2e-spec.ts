import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { hashPassword } from '../src/common/utils/password';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Tests de sécurité du lot B2a. Utilisent la base de développement (seed démo requis)
 * et nettoient les comptes temporaires qu'ils créent.
 */
const DEMO = 'Demo-Passw0rd!2026';
const NEW_PW = 'Nouveau-Mdp#2026x';
const sent: { to: string; subject: string; text: string }[] = [];
const fakeMail = { send: async (m: any) => { sent.push(m); return true; } };

describe('Authentification et permissions (B2a)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const tempEmails: string[] = [];
  const http = () => request(app.getHttpServer());

  const login = (email: string, password = DEMO, rememberMe = false) =>
    http().post('/api/v1/auth/login').send({ email, password, rememberMe });
  const tokenOf = async (email: string) => (await login(email)).body.accessToken as string;
  const cookieOf = (res: request.Response) =>
    (res.headers['set-cookie'] as unknown as string[] | undefined)?.find((c) => c.startsWith('refresh_token='));
  const lastToken = (to: string) => {
    const m = [...sent].reverse().find((x) => x.to === to);
    return m?.text.match(/token=([\w-]+)/)?.[1] as string;
  };

  async function tempUser(label: string, status: 'ACTIVE' | 'INVITED' = 'ACTIVE') {
    const email = `test-${label}-${Date.now()}@test.example`;
    tempEmails.push(email);
    return prisma.user.create({
      data: {
        email, firstName: 'Test', lastName: label, status,
        passwordHash: status === 'ACTIVE' ? await hashPassword(DEMO) : null,
      },
    });
  }

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService).useValue(fakeMail).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({ where: { email: { in: tempEmails } }, select: { id: true } });
    const ids = users.map((u) => u.id);
    await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { actorLabel: { in: tempEmails } }] } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  describe('Routes protégées', () => {
    it('refuse un visiteur non connecté (401)', async () => {
      for (const url of ['/api/v1/users/me', '/api/v1/admin/users']) {
        const r = await http().get(url);
        expect(r.status).toBe(401);
        expect(r.body.code).toBe('UNAUTHENTICATED');
      }
    });
    it('laisse /health publique', async () => {
      expect((await http().get('/api/v1/health')).status).toBe(200);
    });
    it('refuse un jeton falsifié', async () => {
      const r = await http().get('/api/v1/users/me').set('Authorization', 'Bearer abc.def.ghi');
      expect(r.status).toBe(401);
      expect(r.body.code).toBe('TOKEN_INVALID');
    });
  });

  describe('Connexion', () => {
    it('refuse un mauvais mot de passe et un e-mail inconnu avec le MÊME message', async () => {
      const bad = await login('awa.kone@horizon-inclusif.example', 'Faux-Mdp#2026xx');
      const unknown = await login('personne@nulle-part.example', 'Faux-Mdp#2026xx');
      expect(bad.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(bad.body).toEqual(unknown.body);
    });
    it('connecte un utilisateur : jeton, cookie httpOnly, permissions, sans hash', async () => {
      const r = await login('awa.kone@horizon-inclusif.example');
      expect(r.status).toBe(200);
      expect(r.body.accessToken).toBeDefined();
      const c = cookieOf(r)!;
      expect(c).toMatch(/HttpOnly/i);
      expect(c).toMatch(/SameSite=Strict/i);
      expect(r.body.user.permissions).toContain('organization.update');
      expect(JSON.stringify(r.body)).not.toMatch(/passwordHash|argon2/);
    });
    it('verrouille le compte après 5 échecs (429), même avec le bon mot de passe', async () => {
      const u = await tempUser('lock');
      for (let i = 0; i < 5; i++) expect((await login(u.email, 'Faux-Mdp#2026xx')).status).toBe(401);
      const r = await login(u.email, DEMO);
      expect(r.status).toBe(429);
      expect(r.body.code).toBe('ACCOUNT_LOCKED');
    });
    it('refuse la connexion d’un compte désactivé', async () => {
      const u = await tempUser('disabled');
      await prisma.user.update({ where: { id: u.id }, data: { status: 'DISABLED' } });
      expect((await login(u.email)).status).toBe(401);
    });
    it('rejette un e-mail mal formé (422)', async () => {
      expect((await login('pas-un-email')).status).toBe(422);
    });
  });

  describe('Permissions (matrice des rôles)', () => {
    it('Consultation et Président ne peuvent pas administrer les comptes (403)', async () => {
      for (const email of ['fatou.diallo@horizon-inclusif.example', 'awa.kone@horizon-inclusif.example']) {
        const t = await tokenOf(email);
        const r = await http().get('/api/v1/admin/users').set('Authorization', `Bearer ${t}`);
        expect(r.status).toBe(403);
        expect(r.body.code).toBe('FORBIDDEN');
      }
    });
    it('l’administrateur peut lister les comptes (pagination)', async () => {
      const t = await tokenOf('admin@caphci.local');
      const r = await http().get('/api/v1/admin/users?limit=2').set('Authorization', `Bearer ${t}`);
      expect(r.status).toBe(200);
      expect(r.body.data.length).toBeLessThanOrEqual(2);
      expect(r.body.meta.total).toBeGreaterThan(2);
      expect(JSON.stringify(r.body)).not.toMatch(/passwordHash/);
    });
    it('le rôle Consultation n’a pas de droit d’écriture sur l’organisation', async () => {
      const t = await tokenOf('fatou.diallo@horizon-inclusif.example');
      const r = await http().get('/api/v1/users/me').set('Authorization', `Bearer ${t}`);
      expect(r.body.organization.role.code).toBe('OPH_VIEWER');
      expect(r.body.permissions).not.toContain('organization.update');
      expect(r.body.permissions).not.toContain('report.create');
    });
  });

  describe('Session : rotation et déconnexion', () => {
    it('renouvelle le jeton, invalide l’ancien, et coupe tout en cas de réutilisation', async () => {
      const l = await login('koffi.yao@horizon-inclusif.example');
      const c1 = cookieOf(l)!;
      const r1 = await http().post('/api/v1/auth/refresh').set('Cookie', c1);
      expect(r1.status).toBe(200);
      const c2 = cookieOf(r1)!;
      expect(c2).not.toEqual(c1);
      // L'ancien jeton est rejoué → refusé, et la session issue de la rotation est aussi coupée.
      expect((await http().post('/api/v1/auth/refresh').set('Cookie', c1)).status).toBe(401);
      expect((await http().post('/api/v1/auth/refresh').set('Cookie', c2)).status).toBe(401);
    });
    it('la déconnexion révoque la session', async () => {
      const l = await login('koffi.yao@horizon-inclusif.example');
      const c = cookieOf(l)!;
      expect((await http().post('/api/v1/auth/logout').set('Cookie', c)).status).toBe(204);
      expect((await http().post('/api/v1/auth/refresh').set('Cookie', c)).status).toBe(401);
    });
    it('refuse un rafraîchissement sans cookie', async () => {
      expect((await http().post('/api/v1/auth/refresh')).status).toBe(401);
    });
  });

  describe('Mot de passe oublié et invitation', () => {
    it('répond pareil que le compte existe ou non (pas d’énumération)', async () => {
      const a = await http().post('/api/v1/auth/forgot-password').send({ email: 'awa.kone@horizon-inclusif.example' });
      const b = await http().post('/api/v1/auth/forgot-password').send({ email: 'inconnu@nulle-part.example' });
      expect(a.status).toBe(202);
      expect(b.status).toBe(202);
      expect(a.body).toEqual(b.body);
    });
    it('réinitialise le mot de passe avec le lien reçu, une seule fois', async () => {
      const u = await tempUser('reset');
      await http().post('/api/v1/auth/forgot-password').send({ email: u.email });
      const token = lastToken(u.email);
      expect(token).toBeDefined();
      // mot de passe trop faible refusé
      expect((await http().post('/api/v1/auth/reset-password').send({ token, newPassword: 'faible' })).status).toBe(422);
      expect((await http().post('/api/v1/auth/reset-password').send({ token, newPassword: NEW_PW })).status).toBe(204);
      expect((await login(u.email, NEW_PW)).status).toBe(200);
      expect((await login(u.email, DEMO)).status).toBe(401);
      // le lien ne marche qu'une fois
      const again = await http().post('/api/v1/auth/reset-password').send({ token, newPassword: 'Autre-Mdp#2026xy' });
      expect(again.status).toBe(400);
      expect(again.body.code).toBe('INVALID_TOKEN');
    });
    it('invitation : l’admin crée un compte, le titulaire l’active, doublon refusé', async () => {
      const admin = await tokenOf('admin@caphci.local');
      const email = `test-invite-${Date.now()}@test.example`;
      tempEmails.push(email);
      const body = { email, firstName: 'Nouvelle', lastName: 'Recrue', roleCodes: ['MEMBERSHIP_MANAGER'] };
      const created = await http().post('/api/v1/admin/users').set('Authorization', `Bearer ${admin}`).send(body);
      expect(created.status).toBe(201);
      expect(created.body.status).toBe('INVITED');
      expect((await login(email)).status).toBe(401); // pas encore activé
      const token = lastToken(email);
      expect((await http().post('/api/v1/auth/accept-invitation').send({ token, newPassword: NEW_PW })).status).toBe(204);
      expect((await login(email, NEW_PW)).status).toBe(200);
      const dup = await http().post('/api/v1/admin/users').set('Authorization', `Bearer ${admin}`).send(body);
      expect(dup.status).toBe(409);
    });
    it('refuse un rôle inconnu ou un rôle d’OPH pour le personnel', async () => {
      const admin = await tokenOf('admin@caphci.local');
      const r = await http().post('/api/v1/admin/users').set('Authorization', `Bearer ${admin}`)
        .send({ email: `x-${Date.now()}@test.example`, firstName: 'A', lastName: 'B', roleCodes: ['OPH_PRESIDENT'] });
      expect(r.status).toBe(400);
      expect(r.body.code).toBe('INVALID_ROLE');
    });
  });

  describe('Désactivation et profil', () => {
    it('désactiver un compte coupe IMMÉDIATEMENT son accès', async () => {
      const u = await tempUser('cut');
      const token = await tokenOf(u.email);
      expect((await http().get('/api/v1/users/me').set('Authorization', `Bearer ${token}`)).status).toBe(200);
      const admin = await tokenOf('admin@caphci.local');
      const r = await http().patch(`/api/v1/admin/users/${u.id}/status`).set('Authorization', `Bearer ${admin}`).send({ status: 'DISABLED' });
      expect(r.status).toBe(200);
      expect((await http().get('/api/v1/users/me').set('Authorization', `Bearer ${token}`)).status).toBe(401);
    });
    it('un admin ne peut pas désactiver son propre compte', async () => {
      const admin = await tokenOf('admin@caphci.local');
      const me = await http().get('/api/v1/users/me').set('Authorization', `Bearer ${admin}`);
      const r = await http().patch(`/api/v1/admin/users/${me.body.id}/status`).set('Authorization', `Bearer ${admin}`).send({ status: 'DISABLED' });
      expect(r.status).toBe(400);
    });
    it('modifie son profil mais pas son e-mail ni ses rôles', async () => {
      const u = await tempUser('profile');
      const t = await tokenOf(u.email);
      const ok = await http().patch('/api/v1/users/me').set('Authorization', `Bearer ${t}`).send({ phone: '+225 07 00 00 00 00', jobTitle: 'Trésorier' });
      expect(ok.status).toBe(200);
      expect(ok.body.jobTitle).toBe('Trésorier');
      for (const forbidden of [{ email: 'pirate@x.example' }, { status: 'ACTIVE' }, { roleCodes: ['ADMIN'] }]) {
        expect((await http().patch('/api/v1/users/me').set('Authorization', `Bearer ${t}`).send(forbidden)).status).toBe(422);
      }
    });
    it('change le mot de passe : ancien refusé, mauvais actuel refusé', async () => {
      const u = await tempUser('chgpw');
      const t = await tokenOf(u.email);
      const bad = await http().post('/api/v1/users/me/password').set('Authorization', `Bearer ${t}`).send({ currentPassword: 'Faux-Mdp#2026xx', newPassword: NEW_PW });
      expect(bad.status).toBe(400);
      expect(bad.body.code).toBe('INVALID_CURRENT_PASSWORD');
      const ok = await http().post('/api/v1/users/me/password').set('Authorization', `Bearer ${t}`).send({ currentPassword: DEMO, newPassword: NEW_PW });
      expect(ok.status).toBe(204);
      expect((await login(u.email, DEMO)).status).toBe(401);
      expect((await login(u.email, NEW_PW)).status).toBe(200);
    });
  });
});
