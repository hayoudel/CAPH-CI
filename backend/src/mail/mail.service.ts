import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Envoi d'e-mails. Si MAIL_HOST est vide, le message est simplement affiché
 * dans la console (pratique en développement, aucun envoi réel).
 * Un échec d'envoi est journalisé mais ne fait pas échouer l'action métier.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('MAIL_HOST');
    this.from = config.get<string>('MAIL_FROM') ?? 'CAPH-CI <no-reply@caphci.org>';
    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: Number(config.get('MAIL_PORT') ?? 587),
          secure: String(config.get('MAIL_SECURE')) === 'true',
          auth: config.get('MAIL_USER')
            ? { user: config.get('MAIL_USER'), pass: config.get('MAIL_PASSWORD') }
            : undefined,
        })
      : null;
  }

  async send(msg: MailMessage): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(`[E-mail simulé] À: ${msg.to} | Objet: ${msg.subject}\n${msg.text}`);
      return true;
    }
    try {
      await this.transporter.sendMail({ from: this.from, ...msg });
      return true;
    } catch (e) {
      this.logger.error(`Échec d'envoi à ${msg.to} : ${(e as Error).message}`);
      return false;
    }
  }
}
