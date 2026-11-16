import { Module } from '@nestjs/common';
import { AdminNewsController, NewsController, PublicNewsController } from './news.controller';
import { NewsService } from './news.service';

@Module({ controllers: [NewsController, AdminNewsController, PublicNewsController], providers: [NewsService] })
export class NewsModule {}
