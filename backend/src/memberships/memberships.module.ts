import { Module } from '@nestjs/common';
import { AdminMembershipsController } from './admin/admin-memberships.controller';
import { AdminMembershipsService } from './admin/admin-memberships.service';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';

@Module({
  controllers: [MembershipsController, AdminMembershipsController],
  providers: [MembershipsService, AdminMembershipsService],
  exports: [MembershipsService, AdminMembershipsService],
})
export class MembershipsModule {}
