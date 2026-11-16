import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { AuthContextService } from '../auth-context.service';

/** Garde GLOBALE : toute route est privée sauf si elle porte @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly context: AuthContextService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
    if (!token) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Connexion requise.' });
    }

    let sub: string;
    try {
      sub = (await this.jwt.verifyAsync<{ sub: string }>(token)).sub;
    } catch (e) {
      // TOKEN_EXPIRED permet au frontend de tenter un /auth/refresh silencieux.
      const expired = e instanceof TokenExpiredError;
      throw new UnauthorizedException({
        code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
        message: expired ? 'Votre session a expiré.' : 'Session invalide.',
      });
    }

    const user = await this.context.load(sub);
    if (!user) {
      throw new UnauthorizedException({ code: 'TOKEN_INVALID', message: 'Session invalide.' });
    }
    req.user = user;
    return true;
  }
}
