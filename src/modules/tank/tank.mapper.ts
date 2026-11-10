import type { TankResponseDto } from './dto/tank-response.dto';

export function toTankResponse(tank: {
  id: string;
  name: string;
  isActive: boolean;
}): TankResponseDto {
  return { id: tank.id, name: tank.name, isActive: tank.isActive };
}
