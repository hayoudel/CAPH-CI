import { Module } from '@nestjs/common';
import { OpportunitiesController, PublicOpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';

@Module({ controllers: [OpportunitiesController, PublicOpportunitiesController], providers: [OpportunitiesService], exports: [OpportunitiesService] })
export class OpportunitiesModule {}
