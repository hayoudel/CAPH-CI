import { SetMetadata } from '@nestjs/common';
import { PermissionCode } from '../constants/permissions';
export const PERMISSIONS_KEY = 'permissions';
/** Exige que l'utilisateur possède TOUTES les permissions listées. */
export const ANY_PERMISSIONS_KEY = 'any_permissions';
/** Exige AU MOINS UNE des permissions listées (ex. publier directement OU proposer pour validation). */
export const RequireAnyPermission = (...codes: PermissionCode[]) => SetMetadata(ANY_PERMISSIONS_KEY, codes);
export const RequirePermissions = (...codes: PermissionCode[]) => SetMetadata(PERMISSIONS_KEY, codes);
