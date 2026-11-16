import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res, StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS as P } from '../../common/constants/permissions';
import { RequestMeta } from '../memberships.service';
import { AdminMembershipsService } from './admin-memberships.service';
import {
  AssignDelegationDto, DecisionDto, ListMembershipsQueryDto, RecordPaymentDto, RegisterDto, RequestInfoDto, ReviewDocumentDto,
} from './dto/admin-memberships.dto';

const meta = (req: Request): RequestMeta => ({ ip: req.ip, userAgent: req.headers['user-agent'] });

/** Gestion des demandes d'adhésion par le personnel CAPH-CI. */
@ApiTags('Adhésions (personnel CAPH-CI)')
@ApiBearerAuth()
@Controller('admin/memberships')
export class AdminMembershipsController {
  constructor(private readonly svc: AdminMembershipsService) {}

  @Get('stats') @RequirePermissions(P.MEMBERSHIP_READ)
  @ApiOperation({ summary: 'Compteurs par statut et dossiers en retard' })
  stats(@CurrentUser() u: AuthenticatedUser) { return this.svc.stats(u); }

  @Get() @RequirePermissions(P.MEMBERSHIP_READ)
  @ApiOperation({ summary: 'Liste des dossiers déposés (filtres : statut, catégorie, délégation, dates, recherche)' })
  list(@CurrentUser() u: AuthenticatedUser, @Query() q: ListMembershipsQueryDto) { return this.svc.list(u, q); }

  @Get(':id') @RequirePermissions(P.MEMBERSHIP_READ)
  @ApiOperation({ summary: 'Détail complet : données, pièces, historique, décisions, paiement, alertes de doublon' })
  detail(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.detail(u, id); }

  @Get(':id/documents/:docId/file') @RequirePermissions(P.MEMBERSHIP_REVIEW)
  @ApiOperation({ summary: 'Télécharger une pièce (déchiffrée à la volée, lecture tracée dans le journal d’audit)' })
  async file(
    @CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Param('docId', ParseUUIDPipe) docId: string,
    @Req() req: Request, @Res({ passthrough: true }) res: Response,
  ) {
    const f = await this.svc.downloadDocument(u, id, docId, meta(req));
    res.set({
      'Content-Type': f.mimeType,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(f.filename)}`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(f.content);
  }

  @Patch(':id/documents/:docId') @RequirePermissions(P.MEMBERSHIP_REVIEW)
  @ApiOperation({ summary: 'Accepter ou refuser une pièce (motif obligatoire si refus)' })
  reviewDoc(
    @CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Param('docId', ParseUUIDPipe) docId: string,
    @Body() dto: ReviewDocumentDto, @Req() req: Request,
  ) { return this.svc.reviewDocument(u, id, docId, dto, meta(req)); }

  @Patch(':id/delegation') @RequirePermissions(P.MEMBERSHIP_REVIEW)
  @ApiOperation({ summary: 'Rattacher le dossier à une délégation (motif conseillé si différente de la demande)' })
  delegation(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignDelegationDto, @Req() req: Request) {
    return this.svc.assignDelegation(u, id, dto, meta(req));
  }

  @Post(':id/start-review') @HttpCode(HttpStatus.OK) @RequirePermissions(P.MEMBERSHIP_REVIEW)
  @ApiOperation({ summary: 'Commencer l’examen (dossier reçu ou ajourné → en cours d’examen)' })
  startReview(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.svc.startReview(u, id, meta(req));
  }

  @Post(':id/request-info') @HttpCode(HttpStatus.OK) @RequirePermissions(P.MEMBERSHIP_REVIEW)
  @ApiOperation({ summary: 'Demander des compléments (message visible du demandeur, e-mail envoyé)' })
  requestInfo(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RequestInfoDto, @Req() req: Request) {
    return this.svc.requestInfo(u, id, dto, meta(req));
  }

  @Post(':id/decision') @HttpCode(HttpStatus.OK) @RequirePermissions(P.MEMBERSHIP_DECIDE)
  @ApiOperation({ summary: 'Enregistrer la décision officielle (admis / ajourné / refusé) — réservé aux personnes habilitées' })
  decision(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DecisionDto, @Req() req: Request) {
    return this.svc.decide(u, id, dto, meta(req));
  }

  @Post(':id/payment') @RequirePermissions(P.MEMBERSHIP_REGISTER)
  @ApiOperation({ summary: 'Enregistrer le paiement des droits (montants issus du barème)' })
  payment(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RecordPaymentDto, @Req() req: Request) {
    return this.svc.recordPayment(u, id, dto, meta(req));
  }

  @Post(':id/register') @RequirePermissions(P.MEMBERSHIP_REGISTER)
  @ApiOperation({ summary: 'Enregistrer l’adhésion : crée l’organisation membre et invite son Président' })
  register(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RegisterDto, @Req() req: Request) {
    return this.svc.register(u, id, dto, meta(req));
  }
}
