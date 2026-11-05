import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AuthService, RequestMeta } from './auth.service';
import { AcceptInvitationDto, ForgotPasswordDto, LoginDto, ResetPasswordDto } from './dto/auth.dto';

export const REFRESH_COOKIE = 'refresh_token';
const TEN_PER_15_MIN = { default: { limit: 10, ttl: 15 * 60_000 } };

export const metaOf = (req: Request): RequestMeta => ({ ip: req.ip, userAgent: req.headers['user-agent'] });

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  private readonly isProd: boolean;
  constructor(private readonly auth: AuthService, config: ConfigService) {
    this.isProd = config.get('NODE_ENV') === 'production';
  }

  /** Le jeton de rafraîchissement ne transite que dans un cookie httpOnly, limité aux routes /auth. */
  private cookieOptions(maxAge?: number): CookieOptions {
    return { httpOnly: true, secure: this.isProd, sameSite: 'strict', path: '/api/v1/auth', maxAge };
  }

  private respond(res: Response, s: Awaited<ReturnType<AuthService['login']>>) {
    res.cookie(REFRESH_COOKIE, s.refreshToken, this.cookieOptions(s.refreshMaxAgeMs));
    return { accessToken: s.accessToken, expiresIn: s.expiresIn, user: s.user };
  }

  @Public() @Throttle(TEN_PER_15_MIN) @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Connexion', description: 'Renvoie un jeton d’accès (15 min) et pose le cookie de rafraîchissement. 3 échecs = verrouillage 15 min.' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, await this.auth.login(dto.email, dto.password, !!dto.rememberMe, metaOf(req)));
  }

  @Public() @HttpCode(HttpStatus.OK) @ApiCookieAuth(REFRESH_COOKIE)
  @Post('refresh')
  @ApiOperation({ summary: 'Renouveler le jeton d’accès (cookie de rafraîchissement, usage unique)' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, await this.auth.refresh(req.cookies?.[REFRESH_COOKIE], metaOf(req)));
  }

  @Public() @HttpCode(HttpStatus.NO_CONTENT) @ApiCookieAuth(REFRESH_COOKIE)
  @Post('logout')
  @ApiOperation({ summary: 'Déconnexion (révoque la session)' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE], metaOf(req));
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  @Public() @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } }) @HttpCode(HttpStatus.ACCEPTED)
  @Post('forgot-password')
  @ApiOperation({ summary: 'Demander un lien de réinitialisation', description: 'Réponse identique que le compte existe ou non.' })
  forgot(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.auth.forgotPassword(dto.email, metaOf(req));
  }

  @Public() @Throttle(TEN_PER_15_MIN) @HttpCode(HttpStatus.NO_CONTENT)
  @Post('reset-password')
  @ApiOperation({ summary: 'Choisir un nouveau mot de passe avec le jeton reçu par e-mail' })
  async reset(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    await this.auth.resetPassword(dto.token, dto.newPassword, metaOf(req));
  }

  @Public() @Throttle(TEN_PER_15_MIN) @HttpCode(HttpStatus.NO_CONTENT)
  @Post('accept-invitation')
  @ApiOperation({ summary: 'Activer un compte invité et choisir son mot de passe' })
  async accept(@Body() dto: AcceptInvitationDto, @Req() req: Request) {
    await this.auth.acceptInvitation(dto.token, dto.newPassword, metaOf(req));
  }
}
