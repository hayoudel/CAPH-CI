import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Contexte de l'utilisateur connecté, reconstruit depuis la base à CHAQUE requête. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Union des permissions du/des rôle(s) du personnel et du rôle dans l'OPH. */
  permissions: string[];
  roleCodes: string[];
  /** OPH de l'utilisateur (null si personnel CAPH-CI ou si l'OPH n'est pas ACTIVE). */
  organizationId: string | null;
  organizationName: string | null;
  organizationRole: { code: string; label: string } | null;
  /** Délégations auxquelles le personnel est limité (vide + isGlobalScope = pas de limite). */
  delegationIds: string[];
  isGlobalScope: boolean;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => ctx.switchToHttp().getRequest().user,
);
