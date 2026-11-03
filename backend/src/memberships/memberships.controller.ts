import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Req, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { CreateRequestDto, SubmitRequestDto, TrackRequestDto, UpdateRequestDto, UploadDocumentDto } from './dto/memberships.dto';
import { MembershipsService, RequestMeta } from './memberships.service';
import { TrackingCode } from './tracking-code.decorator';

const meta = (req: Request): RequestMeta => ({ ip: req.ip, userAgent: req.headers['user-agent'] });
const CODE_HEADER = { name: 'x-tracking-code', required: true, description: 'Code de suivi reçu par e-mail à la création du dossier' };

/** Parcours d'adhésion côté demandeur : aucune connexion, l'accès au dossier se fait par code de suivi. */
@ApiTags('Adhésion (demandeur)')
@Public()
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Catégories de demande (seules celles dont isOpen = true acceptent des demandes)' })
  categories() { return this.memberships.categories(); }

  @Get('requirements')
  @ApiQuery({ name: 'category', required: false, example: 'PM_ORGANISATION' })
  @ApiOperation({ summary: 'Conditions, critères, pièces requises, barème, déclarations, champs du formulaire et listes de choix' })
  requirements(@Query('category') category = 'PM_ORGANISATION') { return this.memberships.requirements(String(category).slice(0, 40)); }

  @Post('requests') @Throttle({ default: { limit: 5, ttl: 60 * 60_000 } })
  @ApiOperation({ summary: 'Commencer une demande (brouillon). Renvoie le code de suivi, aussi envoyé par e-mail.' })
  create(@Body() dto: CreateRequestDto, @Req() req: Request) { return this.memberships.create(dto, meta(req)); }

  @Get('requests/:id') @ApiHeader(CODE_HEADER)
  @ApiOperation({ summary: 'Reprendre mon dossier (contenu, pièces, champs manquants)' })
  get(@Param('id', ParseUUIDPipe) id: string, @TrackingCode() code?: string) { return this.memberships.get(id, code); }

  @Patch('requests/:id') @ApiHeader(CODE_HEADER)
  @ApiOperation({ summary: 'Enregistrer ma saisie (brouillon ou compléments demandés). Seuls les champs envoyés changent.' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRequestDto, @TrackingCode() code?: string) {
    return this.memberships.update(id, code, dto);
  }

  @Post('requests/:id/documents') @ApiHeader(CODE_HEADER) @ApiConsumes('multipart/form-data')
  @Throttle({ default: { limit: 40, ttl: 15 * 60_000 } })
  @ApiBody({
    schema: {
      type: 'object', required: ['type', 'file'],
      properties: {
        type: { type: 'string', example: 'LEGAL_REGISTRATION', description: 'Type de pièce (voir GET /memberships/requirements)' },
        file: { type: 'string', format: 'binary', description: 'PDF, JPG ou PNG — 10 Mo maximum' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  @ApiOperation({ summary: 'Joindre une pièce (PDF, JPG ou PNG, 10 Mo max ; 3 fichiers max par type de pièce)' })
  upload(
    @Param('id', ParseUUIDPipe) id: string, @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File, @Req() req: Request, @TrackingCode() code?: string,
  ) {
    return this.memberships.uploadDocument(id, code, dto.type, file, meta(req));
  }

  @Delete('requests/:id/documents/:docId') @HttpCode(HttpStatus.NO_CONTENT) @ApiHeader(CODE_HEADER)
  @ApiOperation({ summary: 'Retirer une pièce jointe (impossible si elle a été acceptée)' })
  removeDocument(
    @Param('id', ParseUUIDPipe) id: string, @Param('docId', ParseUUIDPipe) docId: string,
    @Req() req: Request, @TrackingCode() code?: string,
  ) {
    return this.memberships.deleteDocument(id, code, docId, meta(req));
  }

  @Post('requests/:id/submit') @HttpCode(HttpStatus.OK) @ApiHeader(CODE_HEADER)
  @ApiOperation({ summary: 'Déposer le dossier : génère la référence (CAPH-AAAA-NNNNNN). Le statut est « Dossier reçu », jamais « Admis ».' })
  submit(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SubmitRequestDto, @Req() req: Request, @TrackingCode() code?: string) {
    return this.memberships.submit(id, code ?? '', dto, meta(req));
  }

  @Post('requests/:id/withdraw') @HttpCode(HttpStatus.OK) @ApiHeader(CODE_HEADER)
  @ApiOperation({ summary: 'Retirer ma demande (avant décision)' })
  withdraw(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request, @TrackingCode() code?: string) {
    return this.memberships.withdraw(id, code, meta(req));
  }

  @Post('track') @HttpCode(HttpStatus.OK) @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  @ApiOperation({ summary: 'Suivre un dossier déposé (référence + e-mail + code). Réponse identique pour une référence inconnue ou un mauvais code.' })
  track(@Body() dto: TrackRequestDto) { return this.memberships.track(dto); }
}
