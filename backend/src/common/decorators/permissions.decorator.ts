import { SetMetadata } from '@nestjs/common';
import { PermissionCode } from '../constants/permissions';
export const PERMISSIONS_KEY = 'permissions';
/** Exige que l'utilisateur possède TOUTES les permissions listées. */
export const RequirePermissions = (...codes: PermissionCode[]) => SetMetadata(PERMISSIONS_KEY, codes);
