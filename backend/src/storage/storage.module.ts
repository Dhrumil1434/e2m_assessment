import { Global, Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { StorageService } from './storage.service';

@Global()
@Module({
  controllers: [AssetsController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
