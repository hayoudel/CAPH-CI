import {
  BadRequestException, HttpException, HttpStatus, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OneTimeTokenType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { hashPassword, verifyPassword } from '../common/utils/password';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthContextService } from './auth-context.service';
import { hashToken, newToken } from './token.util';

export interface RequestMeta { ip?: string; userAgent?: string }

const DAY = 86_400_000;
const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60_000;
const SESSION_TTL_MS = 1 * DAY;       // sans « se souvenir de moi »
const REMEMBER_TTL_MS = 30 * DAY;     // avec « se souvenir de moi »
const RESET_TTL_MS = 60 * 60_000;     // 1 h
const INVITATION_TTL_MS = 7 * DAY;    // 7 jours

const BAD_CREDENTIALS = {
  code: 'INVALID_CREDENTIALS',
  message: 'Adresse e-mail ou mot de passe incorrect.',
};

@Injectable()
export class AuthService {
  private dummyHash?: Promise<string>;
  private readonly secret: string;
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly context: AuthContextService,
    config: ConfigService,
  ) {
    this.secret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.appUrl = config.getOrThrow<string>('APP_URL').replace(/\/$/, '');
  }

  private h = (t: string) => hashToken(t, this.secret);

  // ───────────────────────────── Connexion ─────────────────────────────

  async login(email: string, password: string, remember: boolean, meta: RequestMeta) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Même durée de calcul que pour un vrai compte : on ne révèle pas si l'e-mail existe.
    if (!user || !user.passwordHash) {
      await verifyPassword(await this.getDummyHash(), password);
      await this.audit.log({ action: 'auth.login.failed', actorLabel: email, metadata: { reason: 'unknown_or_no_password' }, ...meta });
      throw new UnauthorizedException(BAD_CREDENTIALS);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.audit.log({ action: 'auth.login.blocked', actorId: user.id, actorLabel: email, ...meta });
      throw new HttpException(
        { code: 'ACCOUNT_LOCKED', message: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!(await verifyPassword(user.passwordHash, password))) {
      const failed = user.failedLoginCount + 1;
      const lock = failed >= MAX_FAILED_LOGINS;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: lock ? 0 : failed, lockedUntil: lock ? new Date(Date.now() + LOCK_MS) : null },
      });
      await this.audit.log({
        action: lock ? 'auth.account.locked' : 'auth.login.failed',
        actorId: user.id, actorLabel: email, metadata: { reason: 'bad_password' }, ...meta,
      });
      throw new UnauthorizedException(BAD_CREDENTIALS);
    }

    // Mot de passe correct, mais le compte (ou son OPH) n'est pas utilisable : même message générique.
    const ctx = await this.context.load(user.id);
    const orgBlocked = await this.isOrganizationBlocked(user.id);
    if (!ctx || orgBlocked) {
      await this.audit.log({
        action: 'auth.login.failed', actorId: user.id, actorLabel: email,
        metadata: { reason: ctx ? 'organization_inactive' : `status_${user.status}` }, ...meta,
      });
      throw new UnauthorizedException(BAD_CREDENTIALS);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    await this.audit.log({ action: 'auth.login.success', actorId: user.id, actorLabel: email, ...meta });

    const session = await this.issueSession(user.id, user.email, remember, meta);
    return { ...session, user: ctx };
  }

  private async isOrganizationBlocked(userId: string) {
    const m = await this.prisma.organizationMember.findUnique({
      where: { userId }, select: { organization: { select: { status: true } } },
    });
    return !!m && m.organization.status !== 'ACTIVE';
  }

  // ───────────────────────── Session (jetons) ─────────────────────────

  private async issueSession(userId: string, email: string, remember: boolean, meta: RequestMeta) {
    const refreshToken = newToken();
    const ttl = remember ? REMEMBER_TTL_MS : SESSION_TTL_MS;
    await this.prisma.refreshToken.create({
      data: {
        userId, tokenHash: this.h(refreshToken), expiresAt: new Date(Date.now() + ttl),
        userAgent: meta.userAgent?.slice(0, 255), ip: meta.ip,
      },
    });
    const accessToken = await this.jwt.signAsync({ sub: userId, email });
    const exp = (this.jwt.decode(accessToken) as { exp: number }).exp;
    return {
      accessToken,
      expiresIn: exp - Math.floor(Date.now() / 1000),
      refreshToken,
      refreshMaxAgeMs: remember ? REMEMBER_TTL_MS : undefined, // undefined = cookie de session
    };
  }

  /** Renouvelle l'accès. Chaque jeton de rafraîchissement ne sert QU'UNE fois (rotation). */
  async refresh(token: string | undefined, meta: RequestMeta) {
    if (!token) throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Connexion requise.' });
    const rec = await this.prisma.refreshToken.findUnique({ where: { tokenHash: this.h(token) } });
    if (!rec) throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Connexion requise.' });

    if (rec.revokedAt) {
      // Un jeton déjà utilisé est présenté à nouveau : vol probable → on coupe toutes les sessions.
      await this.prisma.refreshToken.updateMany({ where: { userId: rec.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.log({ action: 'auth.refresh.reuse_detected', actorId: rec.userId, ...meta });
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Connexion requise.' });
    }
    if (rec.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'SESSION_EXPIRED', message: 'Votre session a expiré. Reconnectez-vous.' });
    }
    const user = await this.context.load(rec.userId);
    if (!user) throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Connexion requise.' });

    await this.prisma.refreshToken.update({ where: { id: rec.id }, data: { revokedAt: new Date() } });
    // « Se souvenir de moi » se déduit de la durée de vie du jeton d'origine (> 2 jours).
    const remember = rec.expiresAt.getTime() - rec.createdAt.getTime() > 2 * DAY;
    const session = await this.issueSession(rec.userId, user.email, remember, meta);
    return { ...session, user };
  }

  async logout(token: string | undefined, meta: RequestMeta) {
    if (!token) return;
    const rec = await this.prisma.refreshToken.findUnique({ where: { tokenHash: this.h(token) } });
    if (rec && !rec.revokedAt) {
      await this.prisma.refreshToken.update({ where: { id: rec.id }, data: { revokedAt: new Date() } });
      await this.audit.log({ action: 'auth.logout', actorId: rec.userId, ...meta });
    }
  }

  // ───────────────────── Mot de passe et invitations ─────────────────────

  private async createOneTimeToken(userId: string, type: OneTimeTokenType, ttlMs: number) {
    await this.prisma.oneTimeToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: new Date() } });
    const token = newToken();
    await this.prisma.oneTimeToken.create({
      data: { userId, type, tokenHash: this.h(token), expiresAt: new Date(Date.now() + ttlMs) },
    });
    return token;
  }

  /** Réponse identique que le compte existe ou non (pas d'énumération de comptes). */
  async forgotPassword(email: string, meta: RequestMeta) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && user.status === 'ACTIVE') {
      const token = await this.createOneTimeToken(user.id, 'PASSWORD_RESET', RESET_TTL_MS);
      void this.mail.send({
        to: user.email,
        subject: 'CAPH-CI — Réinitialisation de votre mot de passe',
        text:
          `Bonjour ${user.firstName},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n` +
          `${this.appUrl}/reinitialiser-mot-de-passe?token=${token}\n\n` +
          `Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.`,
      });
      await this.audit.log({ action: 'auth.password.reset_requested', actorId: user.id, actorLabel: email, ...meta });
    } else {
      await this.audit.log({ action: 'auth.password.reset_requested', actorLabel: email, metadata: { known: false }, ...meta });
    }
    return { message: 'Si un compte correspond à cette adresse, un lien de réinitialisation vient d’être envoyé.' };
  }

  private async consumeToken(token: string, type: OneTimeTokenType) {
    const rec = await this.prisma.oneTimeToken.findUnique({ where: { tokenHash: this.h(token) }, include: { user: true } });
    if (!rec || rec.type !== type || rec.usedAt || rec.expiresAt < new Date()) {
      throw new BadRequestException({ code: 'INVALID_TOKEN', message: 'Ce lien est invalide ou expiré. Demandez-en un nouveau.' });
    }
    return rec;
  }

  async resetPassword(token: string, newPassword: string, meta: RequestMeta) {
    const rec = await this.consumeToken(token, 'PASSWORD_RESET');
    if (rec.user.status !== 'ACTIVE') {
      throw new BadRequestException({ code: 'INVALID_TOKEN', message: 'Ce lien est invalide ou expiré. Demandez-en un nouveau.' });
    }
    await this.setPassword(rec.userId, newPassword, rec.id);
    await this.revokeSessions(rec.userId);
    void this.mail.send({
      to: rec.user.email, subject: 'CAPH-CI — Votre mot de passe a été modifié',
      text: `Bonjour ${rec.user.firstName},\n\nVotre mot de passe vient d'être modifié. Si ce n'est pas vous, contactez immédiatement la CAPH-CI.`,
    });
    await this.audit.log({ action: 'auth.password.reset', actorId: rec.userId, actorLabel: rec.user.email, ...meta });
  }

  async acceptInvitation(token: string, password: string, meta: RequestMeta) {
    const rec = await this.consumeToken(token, 'INVITATION');
    if (rec.user.status !== 'INVITED') {
      throw new BadRequestException({ code: 'INVALID_TOKEN', message: 'Ce lien est invalide ou expiré.' });
    }
    await this.setPassword(rec.userId, password, rec.id, true);
    await this.audit.log({ action: 'auth.invitation.accepted', actorId: rec.userId, actorLabel: rec.user.email, ...meta });
  }

  private async setPassword(userId: string, password: string, tokenId: string, activate = false) {
    const passwordHash = await hashPassword(password);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null,
          ...(activate ? { status: 'ACTIVE' as const } : {}),
        },
      }),
      this.prisma.oneTimeToken.update({ where: { id: tokenId }, data: { usedAt: new Date() } }),
    ]);
  }

  private revokeSessions(userId: string, exceptHash?: string) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null, ...(exceptHash ? { tokenHash: { not: exceptHash } } : {}) },
      data: { revokedAt: new Date() },
    });
  }

  /** Change le mot de passe de l'utilisateur connecté ; ses AUTRES appareils sont déconnectés. */
  async changePassword(userId: string, current: string, next: string, currentRefreshToken: string | undefined, meta: RequestMeta) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash || !(await verifyPassword(user.passwordHash, current))) {
      throw new BadRequestException({ code: 'INVALID_CURRENT_PASSWORD', message: 'Le mot de passe actuel est incorrect.' });
    }
    if (await verifyPassword(user.passwordHash, next)) {
      throw new BadRequestException({ code: 'PASSWORD_UNCHANGED', message: "Le nouveau mot de passe doit être différent de l'actuel." });
    }
    await this.prisma.user.update({
      where: { id: userId }, data: { passwordHash: await hashPassword(next), passwordChangedAt: new Date() },
    });
    await this.revokeSessions(userId, currentRefreshToken ? this.h(currentRefreshToken) : undefined);
    void this.mail.send({
      to: user.email, subject: 'CAPH-CI — Votre mot de passe a été modifié',
      text: `Bonjour ${user.firstName},\n\nVotre mot de passe vient d'être modifié. Si ce n'est pas vous, contactez immédiatement la CAPH-CI.`,
    });
    await this.audit.log({ action: 'auth.password.changed', actorId: userId, actorLabel: user.email, ...meta });
  }

  /** Envoie (ou renvoie) le lien d'activation d'un compte invité. Utilisé par l'admin, puis par B2b/B4. */
  async sendInvitation(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const token = await this.createOneTimeToken(user.id, 'INVITATION', INVITATION_TTL_MS);
    await this.mail.send({
      to: user.email,
      subject: 'CAPH-CI — Activez votre compte',
      text:
        `Bonjour ${user.firstName},\n\nUn compte vous a été créé sur l'espace numérique de la CAPH-CI.\n` +
        `Pour l'activer et choisir votre mot de passe (lien valable 7 jours) :\n` +
        `${this.appUrl}/activer-compte?token=${token}`,
    });
  }

  private getDummyHash() {
    return (this.dummyHash ??= hashPassword(newToken()));
  }
}
