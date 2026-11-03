import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Tableau de bord')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Tableau de bord adapté à mon profil (kind = MEMBER pour une organisation, STAFF pour le personnel CAPH-CI)' })
  get(@CurrentUser() u: AuthenticatedUser) { return this.svc.get(u); }
}
