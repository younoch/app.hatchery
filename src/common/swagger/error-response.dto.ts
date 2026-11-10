import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FieldErrorDto {
  @ApiProperty({ example: 'name' })
  field: string;

  @ApiProperty({ example: 'required' })
  code: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { max: 50 },
  })
  params?: Record<string, unknown>;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'validation_failed' })
  code: string;

  @ApiProperty({ example: '/tanks' })
  path: string;

  @ApiProperty({ example: 'Validation failed' })
  message: string;

  @ApiPropertyOptional({ type: () => FieldErrorDto, isArray: true })
  errors?: FieldErrorDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  timestamp: string;
}
