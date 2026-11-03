import { StreamableFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

/** Intercepteur d'envoi d'un fichier unique (champ « file », 10 Mo maximum). */
export const uploadOne = () => FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

/** Réponse de téléchargement sûre : jamais mise en cache, type non « devinable » par le navigateur. */
export function sendFile(res: Response, f: { content: Buffer; mimeType: string; filename: string }) {
  res.set({
    'Content-Type': f.mimeType,
    'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(f.filename)}`,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  return new StreamableFile(f.content);
}

export const asBool = ({ value }: { value: unknown }) => (value === true || value === 'true' ? true : value === false || value === 'false' ? false : value);
export const trimmed = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value);

export const fileBody = (fields: Record<string, unknown>) => ({
  schema: { type: 'object', properties: { ...fields, file: { type: 'string', format: 'binary' } } },
});
