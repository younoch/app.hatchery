import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

// Joins the caller's transaction when there is one, otherwise opens its own.
export function runInTransaction<T>(
  prisma: PrismaService,
  tx: Prisma.TransactionClient | undefined,
  work: (client: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return tx ? work(tx) : prisma.$transaction(work);
}