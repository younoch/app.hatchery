import { ApiProperty } from '@nestjs/swagger';

export class TankResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Tank 1' })
  name: string;

  @ApiProperty()
  isActive: boolean;
}
