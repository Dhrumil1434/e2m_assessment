import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @ApiPropertyOptional({ example: 'Front facade renovation' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}
