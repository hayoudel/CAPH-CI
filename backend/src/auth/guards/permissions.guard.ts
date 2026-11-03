import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

/** Garde GLOBALE (après JwtAuthGuard) : vérifie @RequirePermissions(...) côté serveur. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, targets);
    if (!required || required.length === 0) return true; // authentifié suffit

    const user: AuthenticatedUser | undefined = ctx.switchToHttp().getRequest().user;
    const allowed = !!user && required.every((p) => user.permissions.includes(p));
    if (!allowed) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: "Vous n'avez pas l'autorisation d'effectuer cette action." });
    }
    return true;
  }
}
