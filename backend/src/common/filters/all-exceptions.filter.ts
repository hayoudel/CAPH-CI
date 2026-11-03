import {
  ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/**
 * Format d'erreur unique : { statusCode, code, message, details? }.
 * Ne divulgue jamais d'information interne (pile d'appels, SQL, chemins).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const req = host.switchToHttp().getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Une erreur est survenue. Veuillez réessayer plus tard.';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      let customCode: string | undefined;
      if (typeof body === 'string') message = body;
      else {
        const b = body as Record<string, unknown>;
        if (Array.isArray(b.message)) {
          message = 'Les données envoyées sont invalides.';
          details = b.message;
        } else if (typeof b.message === 'string') message = b.message;
        if (typeof b.code === 'string') customCode = b.code;
      }
      code = customCode ?? (HttpStatus[status] ?? 'ERROR');
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT; code = 'CONFLICT';
        message = 'Cette valeur existe déjà.';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND; code = 'NOT_FOUND';
        message = 'Ressource introuvable.';
      } else {
        this.logger.error(`Prisma ${exception.code} sur ${req.method} ${req.url}`);
      }
    } else {
      this.logger.error(
        `${req.method} ${req.url} → ${(exception as Error)?.message}`,
        (exception as Error)?.stack,
      );
    }

    res.status(status).json({ statusCode: status, code, message, ...(details ? { details } : {}) });
  }
}
