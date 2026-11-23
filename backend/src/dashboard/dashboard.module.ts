import { Module } from '@nestjs/common';
import { CommunicationsModule } from '../communications/communications.module';
import { DocumentsModule } from '../documents/documents.module';
import { EvenementsModule } from '../evenements/evenements.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { OpportunitiesModule } from '../opportunities/opportunities.module';
import { RapportsModule } from '../rapports/rapports.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [CommunicationsModule, DocumentsModule, EvenementsModule, MembershipsModule, OpportunitiesModule, RapportsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
