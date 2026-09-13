import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { RegionsController } from './regions.controller';
import { RegionsService } from './regions.service';

@Module({
  imports: [ProjectsModule],
  controllers: [RegionsController],
  providers: [RegionsService],
  exports: [RegionsService],
})
export class RegionsModule {}
