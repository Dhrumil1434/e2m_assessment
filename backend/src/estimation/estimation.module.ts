import { Module } from '@nestjs/common';
import { MeasurementModule } from '../measurement/measurement.module';
import { ProjectsModule } from '../projects/projects.module';
import { EstimationController } from './estimation.controller';
import { EstimationService } from './estimation.service';

@Module({
  imports: [ProjectsModule, MeasurementModule],
  controllers: [EstimationController],
  providers: [EstimationService],
  exports: [EstimationService],
})
export class EstimationModule {}
