import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateRegionDto {
  @ApiPropertyOptional({ enum: ['proposed', 'confirmed'] })
  @IsOptional()
  @IsEnum(['proposed', 'confirmed'])
  status?: 'proposed' | 'confirmed';

  @ApiPropertyOptional({ example: 'Main Wall' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ example: [[10, 20], [100, 20], [100, 200], [10, 200]] })
  @IsOptional()
  @IsArray()
  polygonJson?: number[][];

  @ApiPropertyOptional({ example: 400000 })
  @IsOptional()
  @IsNumber()
  pixelArea?: number;
}
