import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PERMISSIONS as P } from '../common/constants/permissions';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { fileBody, sendFile, uploadOne } from '../common/utils/files';
import { CreateDocumentDto, ListDocumentsQueryDto, UpdateDocumentDto } from './dto/documents.dto';
import { DocumentsService } from './documents.service';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly svc: DocumentsService) {}

  @Get() @RequirePermissions(P.DOCUMENT_READ)
  @ApiOperation({ summary: 'Bibliothèque de documents (filtre par catégorie, recherche)' })
  list(@CurrentUser() u: AuthenticatedUser, @Query() q: ListDocumentsQueryDto) { return this.svc.list(u, q); }

  @Get(':id') @RequirePermissions(P.DOCUMENT_READ)
  get(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.get(u, id); }

  @Get(':id/file') @RequirePermissions(P.DOCUMENT_READ)
  @ApiOperation({ summary: 'Télécharger le fichier du document' })
  async file(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Res({ passthrough: true }) res: Response) {
    return sendFile(res, await this.svc.download(u, id));
  }

  @Post() @RequirePermissions(P.DOCUMENT_MANAGE) @UseInterceptors(uploadOne()) @ApiConsumes('multipart/form-data')
  @ApiBody(fileBody({
    title: { type: 'string' }, description: { type: 'string' },
    category: { type: 'string', enum: ['GUIDE', 'FORM', 'MEETING_MINUTES', 'REFERENCE', 'OTHER'] },
    accessLevel: { type: 'string', enum: ['MEMBERS', 'CONTRIBUTORS'] }, isFeatured: { type: 'boolean' },
  }))
  @ApiOperation({ summary: 'Publier un document (PDF, JPG ou PNG, 10 Mo max)' })
  create(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateDocumentDto, @UploadedFile() file: Express.Multer.File) {
    return this.svc.create(u, dto, file);
  }

  @Patch(':id') @RequirePermissions(P.DOCUMENT_MANAGE)
  update(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDocumentDto) { return this.svc.update(u, id, dto); }

  @Post(':id/archive') @HttpCode(HttpStatus.OK) @RequirePermissions(P.DOCUMENT_MANAGE)
  archive(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.setArchived(u, id, true); }

  @Post(':id/restore') @HttpCode(HttpStatus.OK) @RequirePermissions(P.DOCUMENT_MANAGE)
  restore(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.setArchived(u, id, false); }
}
