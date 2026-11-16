import { Module } from '@nestjs/common';
import { CommunicationsModule } from '../communications/communications.module';
import { DocumentsModule } from '../documents/documents.module';
import { EventsModule } from '../events/events.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { OpportunitiesModule } from '../opportunities/opportunities.module';
import { ReportsModule } from '../reports/reports.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [CommunicationsModule, DocumentsModule, EventsModule, MembershipsModule, OpportunitiesModule, ReportsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
