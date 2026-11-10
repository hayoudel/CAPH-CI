import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { basename } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { detectFileType, StorageService } from './storage.service';

/** Création et lecture des fichiers « métier » (documents, rapports, fiches…). Mêmes règles partout : PDF/JPG/PNG, 10 Mo, nom aléatoire. */
@Injectable()
export class FileAssetService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  /** Valide le fichier (type réel d'après son contenu), le stocke et crée l'enregistrement FileAsset. */
  async create(file: Express.Multer.File | undefined, uploadedById: string | null) {
    if (!file || !file.buffer?.length) {
      throw new UnprocessableEntityException({ code: 'FILE_REQUIRED', message: 'Aucun fichier reçu.' });
    }
    const detected = detectFileType(file.buffer);
    if (!detected) {
      throw new UnprocessableEntityException({ code: 'INVALID_FILE_TYPE', message: 'Format non accepté. Envoyez un fichier PDF, JPG ou PNG.' });
    }
    const stored = await this.storage.save(file.buffer, false);
    const safeName = (basename(file.originalname || `fichier.${detected.ext}`).replace(/[^\p{L}\p{N}._ ()-]/gu, '_') || `fichier.${detected.ext}`).slice(0, 150);
    try {
      return await this.prisma.fileAsset.create({
        data: {
          storageKey: stored.storageKey, originalName: safeName, mimeType: detected.mime, sizeBytes: file.size,
          sha256: stored.sha256, encrypted: stored.encrypted, uploadedById,
        },
      });
    } catch (e) {
      await this.storage.remove(stored.storageKey);
      throw e;
    }
  }

  async read(asset: { storageKey: string; encrypted: boolean; mimeType: string; originalName: string }) {
    try {
      return { content: await this.storage.read(asset.storageKey, asset.encrypted), mimeType: asset.mimeType, filename: asset.originalName };
    } catch {
      throw new UnprocessableEntityException({ code: 'FILE_UNREADABLE', message: 'Le fichier est introuvable ou illisible.' });
    }
  }

  /** Supprime définitivement un fichier devenu inutile (enregistrement + contenu stocké). Ne bloque jamais l'action de l'utilisateur. */
  async discard(fileId: string) {
    try {
      const asset = await this.prisma.fileAsset.delete({ where: { id: fileId } });
      await this.storage.remove(asset.storageKey);
    } catch {
      /* encore référencé ailleurs ou déjà supprimé : on laisse en place */
    }
  }
}
