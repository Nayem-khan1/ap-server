export interface PaginationOptions {
  page: number;
  page_size: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export function getPaginationOptions(query: {
  page?: unknown;
  page_size?: unknown;
}): PaginationOptions {
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.page_size ?? 10);

  const normalizedPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const normalizedPageSize =
    Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 10;

  return {
    page: normalizedPage,
    page_size: normalizedPageSize,
    skip: (normalizedPage - 1) * normalizedPageSize,
  };
}

export function getPaginationMeta(
  page: number,
  pageSize: number,
  total: number,
): PaginationMeta {
  return {
    page,
    page_size: pageSize,
    total,
    total_pages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

