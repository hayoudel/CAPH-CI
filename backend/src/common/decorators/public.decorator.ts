import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
/** Marque une route accessible sans authentification (garde globale ajoutée en B2). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
