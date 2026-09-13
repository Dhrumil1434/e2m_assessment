import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { RegionsModule } from '../regions/regions.module';
import { MeasurementController } from './measurement.controller';
import { MeasurementService } from './measurement.service';

@Module({
  imports: [ProjectsModule, RegionsModule],
  controllers: [MeasurementController],
  providers: [MeasurementService],
  exports: [MeasurementService],
})
export class MeasurementModule {}
