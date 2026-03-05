import { FilterQuery } from "mongoose";

export interface ListQuery {
  page: number;
  page_size: number;
  search?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export function normalizeListQuery(query: Record<string, unknown>): ListQuery {
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.page_size ?? 10);
  const sortOrder = query.sort_order === "desc" ? "desc" : "asc";

  return {
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    page_size:
      Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 10,
    search:
      typeof query.search === "string" && query.search.trim()
        ? query.search.trim()
        : undefined,
    sort_by:
      typeof query.sort_by === "string" && query.sort_by.trim()
        ? query.sort_by.trim()
        : undefined,
    sort_order: sortOrder,
  };
}

export function buildSearchFilter(
  search: string | undefined,
  fields: string[],
): FilterQuery<Record<string, unknown>> {
  if (!search) return {};
  return {
    $or: fields.map((field) => ({
      [field]: { $regex: search, $options: "i" },
    })),
  };
}

