import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { MeasurementService } from './measurement.service';

@ApiTags('measurement')
@Controller('api/v1/projects/:projectId')
export class MeasurementController {
  constructor(private readonly measurementService: MeasurementService) {}

  @Post('measurements')
  @ApiOperation({ summary: 'Set reference measurement' })
  setReference(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateMeasurementDto,
  ) {
    return this.measurementService.setReference(projectId, dto);
  }

  @Post('estimate-areas')
  @ApiOperation({
    summary:
      'Estimate region areas (auto-calibrates from door/facade if no reference)',
  })
  estimateAreas(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.measurementService.estimateAreas(projectId);
  }

  @Post('auto-measure')
  @ApiOperation({
    summary: 'Auto-calibrate scale and estimate all surface areas',
  })
  autoMeasure(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.measurementService.autoEstimate(projectId);
  }
}
