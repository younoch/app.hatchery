import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ErrorCode, FIELD_ERROR_CODES } from '@/common/errors/error-codes';

export class FieldErrorDto {
  @ApiProperty({ example: 'name' })
  field: string;

  @ApiProperty({
    enum: [...FIELD_ERROR_CODES],
    enumName: 'FieldErrorCode',
    example: 'required',
  })
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

  @ApiProperty({
    enum: Object.values(ErrorCode),
    enumName: 'ErrorCode',
    example: 'validation_failed',
  })
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
