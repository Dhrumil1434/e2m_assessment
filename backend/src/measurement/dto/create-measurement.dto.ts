import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class CreateMeasurementDto {
  @ApiProperty()
  @IsUUID()
  regionId: string;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @Min(0.1)
  referenceWidthFt: number;

  @ApiProperty({ example: 150 })
  @IsNumber()
  @Min(1)
  referenceWidthPx: number;
}
