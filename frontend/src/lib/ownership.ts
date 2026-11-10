import type { SessionUser } from '../api/types';

/** Président ou Suppléant de l'OPH : ils gardent la main sur tout ce que leur organisation a ajouté. */
export const isOrgLead = (u: SessionUser | null | undefined) =>
  ['OPH_PRESIDENT', 'OPH_DEPUTY'].includes(u?.organizationRole?.code ?? '');

/** L'auteur, le Président ou le Suppléant peuvent modifier / supprimer. */
export const mayModify = (u: SessionUser | null | undefined, authorId?: string | null) =>
  !!u && (isOrgLead(u) || (!!authorId && authorId === u.id));
