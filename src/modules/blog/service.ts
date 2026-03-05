import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/app-error";
import { BlogModel } from "./model";

function parseTagsCsv(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBlogPayload(payload: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(payload.tags)) {
    return payload;
  }
  if (typeof payload.tags_csv === "string") {
    return { ...payload, tags: parseTagsCsv(payload.tags_csv) };
  }
  return { ...payload, tags: [] };
}

export const blogService = {
  async listBlogs() {
    const items = await BlogModel.find().sort({ updatedAt: -1 });
    return items.map((item) => item.toJSON());
  },

  async createBlog(payload: Record<string, unknown>) {
    const normalized = normalizeBlogPayload(payload);
    const item = await BlogModel.create({
      title_en: normalized.title_en,
      title_bn: normalized.title_bn,
      content_en: normalized.content_en,
      content_bn: normalized.content_bn,
      category: normalized.category,
      tags: Array.isArray(normalized.tags) ? normalized.tags : [],
      featured_image: normalized.featured_image ?? "",
      seo_title: normalized.seo_title,
      seo_description: normalized.seo_description,
      slug: normalized.slug,
      author: normalized.author ?? "Editorial Team",
      publish_status: normalized.publish_status,
    });
    return item.toJSON();
  },

  async updateBlog(id: string, payload: Record<string, unknown>) {
    const item = await BlogModel.findByIdAndUpdate(id, normalizeBlogPayload(payload), {
      new: true,
      runValidators: true,
    });
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Blog not found");
    return item.toJSON();
  },

  async setPublishStatus(id: string, publish_status: "draft" | "published" | "archived") {
    const item = await BlogModel.findByIdAndUpdate(
      id,
      { publish_status },
      { new: true },
    );
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Blog not found");
    return item.toJSON();
  },

  async bulkDelete(ids: string[]) {
    await BlogModel.deleteMany({ _id: { $in: ids } });
    return true;
  },
};
