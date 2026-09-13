import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateRegionDto } from './dto/update-region.dto';
import { RegionsService } from './regions.service';

@ApiTags('regions')
@Controller('api/v1')
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Get('projects/:projectId/regions')
  @ApiOperation({ summary: 'List project regions' })
  findByProject(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.regionsService.findByProject(projectId);
  }

  @Patch('regions/:id')
  @ApiOperation({ summary: 'Update region polygon or confirm' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRegionDto,
  ) {
    return this.regionsService.update(id, dto);
  }

  @Post('projects/:projectId/regions/:regionId/segment-refine')
  @ApiOperation({ summary: 'Refine region segmentation' })
  refine(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('regionId', ParseUUIDPipe) regionId: string,
    @Body() payload: { point?: [number, number]; bbox?: number[] },
  ) {
    return this.regionsService.refineSegment(projectId, regionId, payload);
  }
}
