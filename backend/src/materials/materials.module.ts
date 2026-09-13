import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { RegionsModule } from '../regions/regions.module';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';

@Module({
  imports: [RegionsModule, JobsModule],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}
