import { ApiProperty } from '@nestjs/swagger';

export class AccessTokenResponseDto {
  @ApiProperty()
  access_token: string;
}

export class PasswordChangedResponseDto {
  @ApiProperty({ example: 'Password updated successfully' })
  message: string;

  @ApiProperty()
  access_token: string;
}
