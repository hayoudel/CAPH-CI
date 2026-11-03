import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PERMISSIONS as P } from '../common/constants/permissions';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { fileBody, sendFile, uploadOne } from '../common/utils/files';
import { CreateNewsDto, ListNewsQueryDto, ReviewNewsDto, UpdateNewsDto } from './dto/news.dto';
import { NewsService } from './news.service';

@ApiTags('Actualités (organisations)')
@ApiBearerAuth()
@Controller('news')
export class NewsController {
  constructor(private readonly svc: NewsService) {}

  @Get('categories') @RequirePermissions(P.NEWS_PROPOSE)
  categories() { return this.svc.categories(); }

  @Get() @RequirePermissions(P.NEWS_PROPOSE)
  @ApiOperation({ summary: 'Les propositions d’actualité de mon organisation' })
  list(@CurrentUser() u: AuthenticatedUser, @Query() q: ListNewsQueryDto) { return this.svc.listOwn(u, q); }

  @Get(':id') @RequirePermissions(P.NEWS_PROPOSE)
  get(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.getOwn(u, id); }

  @Post() @RequirePermissions(P.NEWS_PROPOSE)
  @ApiOperation({ summary: 'Proposer une actualité à la CAPH-CI' })
  create(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateNewsDto) { return this.svc.create(u, dto); }

  @Patch(':id') @RequirePermissions(P.NEWS_PROPOSE)
  @ApiOperation({ summary: 'Modifier une proposition (une correction la soumet de nouveau)' })
  update(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateNewsDto) { return this.svc.update(u, id, dto); }

  @Post(':id/attachments') @RequirePermissions(P.NEWS_PROPOSE) @UseInterceptors(uploadOne()) @ApiConsumes('multipart/form-data') @ApiBody(fileBody({}))
  @ApiOperation({ summary: 'Joindre un fichier (PDF, JPG ou PNG ; 5 maximum)' })
  attach(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: Express.Multer.File) { return this.svc.addAttachment(u, id, file); }

  @Delete(':id/attachments/:attId') @RequirePermissions(P.NEWS_PROPOSE)
  detach(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Param('attId', ParseUUIDPipe) attId: string) { return this.svc.removeAttachment(u, id, attId); }

  @Get(':id/attachments/:attId/file') @RequirePermissions(P.NEWS_PROPOSE)
  async file(
    @CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Param('attId', ParseUUIDPipe) attId: string,
    @Res({ passthrough: true }) res: Response,
  ) { return sendFile(res, await this.svc.downloadOwn(u, id, attId)); }
}

@ApiTags('Actualités (personnel CAPH-CI)')
@ApiBearerAuth()
@Controller('admin/news')
export class AdminNewsController {
  constructor(private readonly svc: NewsService) {}

  @Get() @RequirePermissions(P.NEWS_REVIEW)
  @ApiOperation({ summary: 'Toutes les propositions d’actualité (filtre par statut ou organisation)' })
  list(@Query() q: ListNewsQueryDto) { return this.svc.listAll(q); }

  @Get(':id') @RequirePermissions(P.NEWS_REVIEW)
  get(@Param('id', ParseUUIDPipe) id: string) { return this.svc.getAny(id); }

  @Get(':id/attachments/:attId/file') @RequirePermissions(P.NEWS_REVIEW)
  async file(
    @CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Param('attId', ParseUUIDPipe) attId: string,
    @Res({ passthrough: true }) res: Response,
  ) { return sendFile(res, await this.svc.downloadAny(u, id, attId)); }

  @Post(':id/review') @HttpCode(HttpStatus.OK) @RequirePermissions(P.NEWS_REVIEW)
  @ApiOperation({ summary: 'Valider : correction / approuvée / refusée ; puis publier une proposition approuvée' })
  review(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewNewsDto) { return this.svc.review(u, id, dto); }
}

@ApiTags('Site public')
@Public()
@Controller('public/news')
export class PublicNewsController {
  constructor(private readonly svc: NewsService) {}

  @Get() @ApiOperation({ summary: 'Actualités publiées' })
  list(@Query() q: ListNewsQueryDto) { return this.svc.listPublic(q); }
}
