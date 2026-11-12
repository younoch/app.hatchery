import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UUID_SCHEMA } from '@/common/swagger/constraints';
import { TANK_NAME_MAX } from '@/common/validation/limits';

export class CreateTankDto {
  @ApiProperty({ example: 'Tank 1', maxLength: TANK_NAME_MAX })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(TANK_NAME_MAX)
  name: string;

  @ApiPropertyOptional({
    description: 'Required for the super admin; others may only name their own',
    ...UUID_SCHEMA,
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
