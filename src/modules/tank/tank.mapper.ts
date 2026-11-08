export function toTankResponse(tank: {
  id: string;
  name: string;
  isActive: boolean;
}) {
  return { id: tank.id, name: tank.name, isActive: tank.isActive };
}