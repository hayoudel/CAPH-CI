import { Module } from '@nestjs/common';
import { CommunicationsController, PublicCommunicationsController } from './communications.controller';
import { CommunicationsService } from './communications.service';

@Module({ controllers: [CommunicationsController, PublicCommunicationsController], providers: [CommunicationsService], exports: [CommunicationsService] })
export class CommunicationsModule {}
