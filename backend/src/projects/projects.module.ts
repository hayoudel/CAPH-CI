import { Module } from '@nestjs/common';
import { AdminProjectsController, ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({ controllers: [ProjectsController, AdminProjectsController], providers: [ProjectsService] })
export class ProjectsModule {}
