import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssignMaterialDto } from './dto/assign-material.dto';
import { MaterialsService } from './materials.service';

@ApiTags('materials')
@Controller('api/v1')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get('materials')
  @ApiOperation({ summary: 'List material catalog' })
  findAll() {
    return this.materialsService.findAll();
  }

  @Post('regions/:id/materials')
  @ApiOperation({ summary: 'Assign material variant to region' })
  assign(
    @Param('id', ParseUUIDPipe) regionId: string,
    @Body() dto: AssignMaterialDto,
  ) {
    return this.materialsService.assignToRegion(regionId, dto);
  }

  @Delete('regions/:id/materials')
  @ApiOperation({ summary: 'Remove material assignment from region' })
  clear(@Param('id', ParseUUIDPipe) regionId: string) {
    return this.materialsService.clearAssignment(regionId);
  }

  @Post('regions/:id/preview')
  @ApiOperation({ summary: 'Enqueue material preview render' })
  preview(@Param('id', ParseUUIDPipe) regionId: string) {
    return this.materialsService.enqueuePreview(regionId);
  }

  @Post('images/:imageId/rebuild-design')
  @ApiOperation({ summary: 'Rebuild design composite from all assignments' })
  rebuildDesign(@Param('imageId', ParseUUIDPipe) imageId: string) {
    return this.materialsService.rebuildDesign(imageId);
  }
}
