import * as argon2 from 'argon2';

/** Paramètres argon2id recommandés par l'OWASP (19 Mo, 2 itérations, 1 thread). */
const OPTIONS: argon2.Options = {
  type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1,
};

export const hashPassword = (plain: string) => argon2.hash(plain, OPTIONS);

export const verifyPassword = async (hash: string, plain: string) => {
  try { return await argon2.verify(hash, plain); } catch { return false; }
};

/** Politique de la maquette : 12 caractères min., majuscule, minuscule, chiffre, spécial. */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}$/;
export const PASSWORD_MESSAGE =
  'Utilisez au moins 12 caractères, avec une majuscule, une minuscule, un chiffre et un caractère spécial.';
