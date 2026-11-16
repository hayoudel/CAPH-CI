import { createHmac, randomBytes } from 'crypto';

/** Jeton aléatoire opaque (192 bits). Envoyé à l'utilisateur ; seule son empreinte est stockée. */
export const newToken = () => randomBytes(48).toString('base64url');

/** Empreinte HMAC-SHA256 : une fuite de la base ne permet pas de rejouer un jeton. */
export const hashToken = (token: string, secret: string) =>
  createHmac('sha256', secret).update(token).digest('hex');
