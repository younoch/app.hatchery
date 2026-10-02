import { PaginatedResult } from '../dto/paginated-result.dto';

export async function paginate<T>(
  findManyFn: () => Promise<T[]>,
  countFn: () => Promise<number>,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<T>> {
  const [items, total] = await Promise.all([findManyFn(), countFn()]);

  return {
    items,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasNextPage: page * pageSize < total,
    },
  };
}