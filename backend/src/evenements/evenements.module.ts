import { Module } from '@nestjs/common';
import { EvenementsController, PublicEvenementsController } from './evenements.controller';
import { EvenementsService } from './evenements.service';

@Module({ controllers: [EvenementsController, PublicEvenementsController], providers: [EvenementsService], exports: [EvenementsService] })
export class EvenementsModule {}
