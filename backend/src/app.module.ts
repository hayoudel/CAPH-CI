import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { DirectoryModule } from './directory/directory.module';
import { MembershipsModule } from './memberships/memberships.module';
import { StorageModule } from './storage/storage.module';
import { ScheduleModule } from '@nestjs/schedule';
import { DocumentsModule } from './documents/documents.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { CommunicationsModule } from './communications/communications.module';
import { EventsModule } from './events/events.module';
import { ReportsModule } from './reports/reports.module';
import { NewsModule } from './news/news.module';
import { ProjectsModule } from './projects/projects.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthController } from './health/health.controller';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Limite générale : 100 requêtes / minute / IP (des limites plus strictes seront posées sur /auth)
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
      skipIf: () => process.env.NODE_ENV === 'test', // limites désactivées pendant les tests automatiques
    }),
    PrismaModule,
    AuditModule,
    MailModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    DirectoryModule,
    StorageModule,
    ScheduleModule.forRoot(),
    MembershipsModule,
    DocumentsModule,
    OpportunitiesModule,
    CommunicationsModule,
    EventsModule,
    ReportsModule,
    NewsModule,
    ProjectsModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
