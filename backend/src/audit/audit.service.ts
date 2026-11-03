import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  action: string;               // ex. 'auth.login.success', 'membership.decision'
  actorId?: string | null;
  actorLabel?: string | null;   // e-mail ou 'anonyme'
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>; // JAMAIS de mot de passe ni de contenu de pièce
  ip?: string;
  userAgent?: string;
}

/** Journal d'audit append-only. Une panne d'audit ne doit jamais bloquer l'action métier. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          actorId: entry.actorId ?? null,
          actorLabel: entry.actorLabel ?? null,
          entityType: entry.entityType,
          entityId: entry.entityId,
          metadata: (entry.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          ip: entry.ip,
          userAgent: entry.userAgent?.slice(0, 255),
        },
      });
    } catch (e) {
      this.logger.error(`Échec d'écriture de l'audit (${entry.action}) : ${(e as Error).message}`);
    }
  }
}
