import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EstimationService } from './estimation.service';

@ApiTags('estimation')
@Controller('api/v1/projects/:projectId')
export class EstimationController {
  constructor(private readonly estimationService: EstimationService) {}

  @Post('estimate-quantities')
  @ApiOperation({ summary: 'Calculate material quantities' })
  estimateQuantities(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.estimationService.estimateQuantities(projectId);
  }

  @Post('estimate-cost')
  @ApiOperation({ summary: 'Calculate project cost' })
  estimateCost(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.estimationService.estimateCost(projectId);
  }
}
