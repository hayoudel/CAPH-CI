import { Global, Module } from '@nestjs/common';
import { FileAssetService } from './file-asset.service';
import { StorageService } from './storage.service';

@Global()
@Module({ providers: [StorageService, FileAssetService], exports: [StorageService, FileAssetService] })
export class StorageModule {}
