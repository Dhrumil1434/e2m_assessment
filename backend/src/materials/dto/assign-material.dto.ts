import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignMaterialDto {
  @ApiProperty()
  @IsUUID()
  materialVariantId: string;
}
