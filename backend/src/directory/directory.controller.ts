import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { DirectoryQueryDto } from './dto/directory.dto';
import { DirectoryService } from './directory.service';

@ApiTags('Annuaire (public)')
@Public()
@Controller('directory')
export class DirectoryController {
  constructor(private readonly directory: DirectoryService) {}

  @Get('filters')
  @ApiOperation({ summary: 'Valeurs disponibles pour les filtres (régions, domaines, types de handicap)' })
  filters() { return this.directory.filters(); }

  @Get('organizations')
  @ApiOperation({ summary: "Annuaire des OPH : recherche par nom, région, domaine ou type de handicap. N'affiche que les informations rendues publiques." })
  list(@Query() q: DirectoryQueryDto) { return this.directory.list(q); }

  @Get('organizations/:id')
  @ApiOperation({ summary: "Fiche publique d'une OPH (404 si elle n'est pas dans l'annuaire)" })
  get(@Param('id', ParseUUIDPipe) id: string) { return this.directory.get(id); }
}
