import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';

export type DetectedType = { mime: 'application/pdf' | 'image/jpeg' | 'image/png'; ext: 'pdf' | 'jpg' | 'png' };

/** Détecte le VRAI type d'un fichier d'après son contenu (signature binaire), jamais d'après son nom. */
export function detectFileType(buf: Buffer): DetectedType | null {
  if (buf.length >= 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-') return { mime: 'application/pdf', ext: 'pdf' };
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  return null;
}

/**
 * Stockage PRIVÉ des fichiers : hors de tout dossier public, nom aléatoire, jamais d'URL directe.
 * Les pièces sensibles (identité) sont chiffrées au repos en AES-256-GCM si FILES_ENCRYPTION_KEY est définie.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly root: string;
  private readonly key: Buffer | null;

  constructor(config: ConfigService) {
    this.root = resolve(config.get<string>('STORAGE_DIR') ?? './storage');
    const raw = config.get<string>('FILES_ENCRYPTION_KEY');
    this.key = raw ? Buffer.from(raw, 'base64') : null;
    if (this.key && this.key.length !== 32) {
      throw new Error('FILES_ENCRYPTION_KEY doit être une clé de 32 octets encodée en base64 (openssl rand -base64 32)');
    }
    if (!this.key) this.logger.warn('FILES_ENCRYPTION_KEY absente : les pièces d’identité ne seront PAS chiffrées (acceptable en développement uniquement).');
  }

  private pathOf(storageKey: string) {
    if (!/^[a-f0-9]{48}$/.test(storageKey)) throw new Error('Clé de stockage invalide');
    return join(this.root, storageKey.slice(0, 2), storageKey);
  }

  /** Enregistre le fichier ; retourne la clé, l'empreinte du contenu clair et l'état de chiffrement. */
  async save(content: Buffer, sensitive: boolean) {
    const storageKey = randomBytes(24).toString('hex');
    const encrypt = sensitive && !!this.key;
    let data = content;
    if (encrypt) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', this.key!, iv);
      const enc = Buffer.concat([cipher.update(content), cipher.final()]);
      data = Buffer.concat([iv, cipher.getAuthTag(), enc]);
    }
    const file = this.pathOf(storageKey);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, data, { mode: 0o600 });
    return { storageKey, sha256: createHash('sha256').update(content).digest('hex'), encrypted: encrypt };
  }

  async read(storageKey: string, encrypted: boolean): Promise<Buffer> {
    const raw = await readFile(this.pathOf(storageKey));
    if (!encrypted) return raw;
    if (!this.key) throw new UnprocessableEntityException({ code: 'ENCRYPTION_KEY_MISSING', message: 'Fichier illisible.' });
    const d = createDecipheriv('aes-256-gcm', this.key, raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([d.update(raw.subarray(28)), d.final()]);
  }

  async remove(storageKey: string) {
    await rm(this.pathOf(storageKey), { force: true });
  }
}
