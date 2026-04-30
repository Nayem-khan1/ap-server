import { Types } from "mongoose";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/app-error";
import {
  BlogAuthorModel,
  BlogCategoryModel,
  BlogModel,
  type BlogCategoryPublishStatus,
  type BlogPublishStatus,
  type BlogRichTextDocument,
  type IBlogContentBlock,
} from "./model";

interface ResolvedCategory {
  id: string;
  name: string;
  slug: string;
}

interface ResolvedAuthor {
  id: string;
  name: string;
  avatar: string;
  bio: string;
}

interface DuplicateKeyError {
  code?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseTagsCsv(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim();
}

function normalizeObjectId(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const id = value.trim();
  return Types.ObjectId.isValid(id) ? id : "";
}

function normalizeRichTextDocument(value: unknown): BlogRichTextDocument | null {
  if (!isRecord(value)) {
    return null;
  }

  return value as BlogRichTextDocument;
}

function isDuplicateKeyError(error: unknown): error is DuplicateKeyError {
  return Boolean(error) && typeof error === "object" && (error as DuplicateKeyError).code === 11000;
}

function normalizeBlogStatus(value: unknown, fallback: BlogPublishStatus): BlogPublishStatus {
  return value === "published" || value === "archived" || value === "draft"
    ? value
    : fallback;
}

function normalizeCategoryStatus(
  value: unknown,
  fallback: BlogCategoryPublishStatus,
): BlogCategoryPublishStatus {
  return value === "published" || value === "draft" ? value : fallback;
}

function buildExcerpt(value: string, maxLength = 180): string {
  const plain = value.replace(/\s+/g, " ").trim();
  if (!plain) return "";
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).replace(/\s+\S*$/, "").trimEnd()}...`;
}

function splitLegacyParagraphs(value: string): string[] {
  return value
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeLegacyBlocks(contentEn: string, contentBn: string): IBlogContentBlock[] {
  const english = splitLegacyParagraphs(contentEn);
  const bangla = splitLegacyParagraphs(contentBn);
  const total = Math.max(english.length, bangla.length);
  const blocks: IBlogContentBlock[] = [];

  for (let index = 0; index < total; index += 1) {
    const valueEn = english[index] ?? bangla[index] ?? "";
    const valueBn = bangla[index] ?? english[index] ?? "";

    if (!valueEn && !valueBn) {
      continue;
    }

    blocks.push({
      type: "text",
      value_en: valueEn,
      value_bn: valueBn,
      url: "",
      caption_en: "",
      caption_bn: "",
      level: 2,
      rich_text_en: null,
      rich_text_bn: null,
      order_no: index,
    });
  }

  return blocks;
}

function normalizeBlock(
  block: unknown,
  index: number,
): IBlogContentBlock | null {
  if (!isRecord(block)) {
    return null;
  }

  const type = block.type;

  if (type === "image") {
    const url = normalizeText(block.url);
    if (!url) return null;

    return {
      type: "image",
      value_en: "",
      value_bn: "",
      url,
      caption_en: normalizeText(block.caption_en ?? block.caption),
      caption_bn: normalizeText(block.caption_bn ?? block.caption),
      level: 2,
      rich_text_en: null,
      rich_text_bn: null,
      order_no: index,
    };
  }

  if (type === "heading" || type === "text" || type === "quote") {
    const valueEn = normalizeText(block.value_en ?? block.value);
    const valueBn = normalizeText(block.value_bn ?? block.value);

    if (!valueEn && !valueBn) {
      return null;
    }

    return {
      type,
      value_en: valueEn || valueBn,
      value_bn: valueBn || valueEn,
      url: "",
      caption_en: "",
      caption_bn: "",
      level:
        type === "heading"
          ? Math.min(3, Math.max(1, Number(block.level ?? 2) || 2))
          : 2,
      rich_text_en:
        type === "text" ? normalizeRichTextDocument(block.rich_text_en) : null,
      rich_text_bn:
        type === "text" ? normalizeRichTextDocument(block.rich_text_bn) : null,
      order_no: index,
    };
  }

  return null;
}

function normalizeContentBlocks(
  blocks: unknown,
  contentEn: unknown,
  contentBn: unknown,
): IBlogContentBlock[] {
  if (Array.isArray(blocks) && blocks.length > 0) {
    const normalized: IBlogContentBlock[] = [];

    blocks.forEach((block, index) => {
      const normalizedBlock = normalizeBlock(block, index);
      if (normalizedBlock) {
        normalized.push(normalizedBlock);
      }
    });

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return normalizeLegacyBlocks(normalizeText(contentEn), normalizeText(contentBn));
}

function serializeBlocksToText(
  blocks: IBlogContentBlock[],
  language: "en" | "bn",
): string {
  const valueKey = language === "en" ? "value_en" : "value_bn";
  const captionKey = language === "en" ? "caption_en" : "caption_bn";

  return [...blocks]
    .sort((left, right) => left.order_no - right.order_no)
    .map((block) => {
      if (block.type === "image") {
        return block[captionKey].trim();
      }
      return block[valueKey].trim();
    })
    .filter(Boolean)
    .join("\n\n");
}

function estimateReadTime(blocks: IBlogContentBlock[]): string {
  const candidate = [serializeBlocksToText(blocks, "en"), serializeBlocksToText(blocks, "bn")]
    .sort((left, right) => right.length - left.length)[0];

  const words = candidate.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return `${minutes} min read`;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function normalizeTags(
  payload: Record<string, unknown>,
  fallback: Record<string, unknown> | undefined,
): string[] {
  if (Array.isArray(payload.tags)) {
    return payload.tags
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  if (typeof payload.tags_csv === "string") {
    return parseTagsCsv(payload.tags_csv);
  }

  if (Array.isArray(fallback?.tags)) {
    return fallback.tags
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  return [];
}

function resolvePublishedAt(
  payload: Record<string, unknown>,
  fallback: Record<string, unknown> | undefined,
  publishStatus: BlogPublishStatus,
): Date | null {
  const explicitDate = toDate(payload.published_at);
  if (explicitDate) {
    return explicitDate;
  }

  const existingDate = toDate(fallback?.published_at);
  if (existingDate) {
    return existingDate;
  }

  if (publishStatus === "published") {
    return new Date();
  }

  return null;
}

function createFallbackSlug(prefix: string): string {
  return `${prefix}-${new Types.ObjectId().toHexString()}`;
}

function parseCategoryReference(value: unknown): Partial<ResolvedCategory> {
  if (typeof value === "string") {
    return {
      name: normalizeText(value),
      slug: slugify(normalizeText(value)),
    };
  }

  if (!isRecord(value)) {
    return {};
  }

  return {
    id: normalizeObjectId(value.id),
    name: normalizeText(value.name ?? value.title),
    slug: normalizeText(value.slug),
  };
}

function parseAuthorReference(value: unknown): Partial<ResolvedAuthor> {
  if (typeof value === "string") {
    return {
      name: normalizeText(value),
    };
  }

  if (!isRecord(value)) {
    return {};
  }

  return {
    id: normalizeObjectId(value.id),
    name: normalizeText(value.name),
    avatar: normalizeText(value.avatar),
    bio: normalizeText(value.bio),
  };
}

function mapCategoryRecord(item: { id?: unknown; title?: unknown; slug?: unknown }): ResolvedCategory {
  return {
    id: String(item.id ?? ""),
    name: normalizeText(item.title),
    slug: normalizeText(item.slug),
  };
}

function mapAuthorRecord(item: {
  id?: unknown;
  name?: unknown;
  avatar?: unknown;
  bio?: unknown;
}): ResolvedAuthor {
  return {
    id: String(item.id ?? ""),
    name: normalizeText(item.name),
    avatar: normalizeText(item.avatar),
    bio: normalizeText(item.bio),
  };
}

async function resolveCategory(
  input: Partial<ResolvedCategory>,
): Promise<ResolvedCategory> {
  const categoryId = normalizeObjectId(input.id);
  if (categoryId) {
    const existing = await BlogCategoryModel.findById(categoryId);
    if (existing) {
      return mapCategoryRecord(existing.toJSON() as Record<string, unknown>);
    }
  }

  const categoryName = normalizeText(input.name);
  const categorySlug = normalizeText(input.slug) || slugify(categoryName);

  if (categorySlug) {
    const existingBySlug = await BlogCategoryModel.findOne({ slug: categorySlug });
    if (existingBySlug) {
      return mapCategoryRecord(existingBySlug.toJSON() as Record<string, unknown>);
    }
  } else if (categoryName) {
    const existingByTitle = await BlogCategoryModel.findOne({ title: categoryName });
    if (existingByTitle) {
      return mapCategoryRecord(existingByTitle.toJSON() as Record<string, unknown>);
    }
  }

  if (!categoryName) {
    return {
      id: "",
      name: "",
      slug: "",
    };
  }

  try {
    const created = await BlogCategoryModel.create({
      title: categoryName,
      slug: categorySlug || createFallbackSlug("category"),
      description: "",
      publish_status: "published",
    });

    return mapCategoryRecord(created.toJSON() as Record<string, unknown>);
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    const existingAfterRace =
      (categorySlug && (await BlogCategoryModel.findOne({ slug: categorySlug }))) ||
      (await BlogCategoryModel.findOne({ title: categoryName }));

    if (!existingAfterRace) {
      throw error;
    }

    return mapCategoryRecord(existingAfterRace.toJSON() as Record<string, unknown>);
  }
}

async function resolveAuthor(
  input: Partial<ResolvedAuthor>,
): Promise<ResolvedAuthor> {
  const authorId = normalizeObjectId(input.id);
  if (authorId) {
    const existing = await BlogAuthorModel.findById(authorId);
    if (existing) {
      return mapAuthorRecord(existing.toJSON() as Record<string, unknown>);
    }
  }

  const authorName = normalizeText(input.name);
  const authorSlug = slugify(authorName);
  const existing = authorSlug
    ? await BlogAuthorModel.findOne({ slug: authorSlug })
    : authorName
      ? await BlogAuthorModel.findOne({ name: authorName })
      : null;

  if (existing) {
    const nextAvatar = normalizeText(existing.avatar) || normalizeText(input.avatar);
    const nextBio = normalizeText(existing.bio) || normalizeText(input.bio);

    if (nextAvatar !== existing.avatar || nextBio !== existing.bio) {
      existing.avatar = nextAvatar;
      existing.bio = nextBio;
      await existing.save();
    }

    return mapAuthorRecord(existing.toJSON() as Record<string, unknown>);
  }

  if (!authorName) {
    return {
      id: "",
      name: "",
      avatar: "",
      bio: "",
    };
  }

  try {
    const created = await BlogAuthorModel.create({
      name: authorName,
      slug: authorSlug || createFallbackSlug("author"),
      avatar: normalizeText(input.avatar),
      bio: normalizeText(input.bio),
    });

    return mapAuthorRecord(created.toJSON() as Record<string, unknown>);
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    const existingAfterRace =
      (authorSlug && (await BlogAuthorModel.findOne({ slug: authorSlug }))) ||
      (await BlogAuthorModel.findOne({ name: authorName }));

    if (!existingAfterRace) {
      throw error;
    }

    return mapAuthorRecord(existingAfterRace.toJSON() as Record<string, unknown>);
  }
}

async function syncMissingCategoriesFromBlogs() {
  const blogs = await BlogModel.find({
    category: { $exists: true, $nin: ["", null] },
  }).select("_id category category_id category_slug");

  const cache = new Map<string, ResolvedCategory>();
  const operations: Array<Record<string, unknown>> = [];

  for (const item of blogs) {
    const data = item.toJSON() as Record<string, unknown>;
    const key =
      normalizeObjectId(data.category_id) ||
      normalizeText(data.category_slug) ||
      normalizeText(data.category);

    let resolved = cache.get(key);
    if (!resolved) {
      resolved = await resolveCategory({
        id: normalizeObjectId(data.category_id),
        name: normalizeText(data.category),
        slug: normalizeText(data.category_slug),
      });
      cache.set(key, resolved);
    }

    if (!resolved.id) {
      continue;
    }

    const currentCategoryId = normalizeObjectId(data.category_id);
    const currentCategoryName = normalizeText(data.category);
    const currentCategorySlug = normalizeText(data.category_slug);

    if (
      currentCategoryId !== resolved.id ||
      currentCategoryName !== resolved.name ||
      currentCategorySlug !== resolved.slug
    ) {
      operations.push({
        updateOne: {
          filter: { _id: item._id },
          update: {
            $set: {
              category_id: resolved.id,
              category: resolved.name,
              category_slug: resolved.slug,
            },
          },
        },
      });
    }
  }

  if (operations.length > 0) {
    await BlogModel.bulkWrite(operations as any);
  }
}

async function syncMissingAuthorsFromBlogs() {
  const blogs = await BlogModel.find({
    author: { $exists: true, $nin: ["", null] },
  }).select("_id author author_id author_avatar author_bio");

  const cache = new Map<string, ResolvedAuthor>();
  const operations: Array<Record<string, unknown>> = [];

  for (const item of blogs) {
    const data = item.toJSON() as Record<string, unknown>;
    const key = normalizeObjectId(data.author_id) || normalizeText(data.author);

    let resolved = cache.get(key);
    if (!resolved) {
      resolved = await resolveAuthor({
        id: normalizeObjectId(data.author_id),
        name: normalizeText(data.author),
        avatar: normalizeText(data.author_avatar),
        bio: normalizeText(data.author_bio),
      });
      cache.set(key, resolved);
    }

    if (!resolved.id) {
      continue;
    }

    const currentAuthorId = normalizeObjectId(data.author_id);
    const currentAuthorName = normalizeText(data.author);
    const currentAuthorAvatar = normalizeText(data.author_avatar);
    const currentAuthorBio = normalizeText(data.author_bio);

    if (
      currentAuthorId !== resolved.id ||
      currentAuthorName !== resolved.name ||
      currentAuthorAvatar !== resolved.avatar ||
      currentAuthorBio !== resolved.bio
    ) {
      operations.push({
        updateOne: {
          filter: { _id: item._id },
          update: {
            $set: {
              author_id: resolved.id,
              author: resolved.name,
              author_avatar: resolved.avatar,
              author_bio: resolved.bio,
            },
          },
        },
      });
    }
  }

  if (operations.length > 0) {
    await BlogModel.bulkWrite(operations as any);
  }
}

async function syncBlogRelationships() {
  await syncMissingCategoriesFromBlogs();
  await syncMissingAuthorsFromBlogs();
}

function formatBlogJson(item: { toJSON: () => Record<string, unknown> }) {
  const data = item.toJSON();
  const blocks = normalizeContentBlocks(data.content_blocks, data.content_en, data.content_bn);
  const contentEn = serializeBlocksToText(blocks, "en");
  const contentBn = serializeBlocksToText(blocks, "bn");
  const publishedAt = toDate(data.published_at);
  const thumbnail = normalizeText(data.thumbnail ?? data.featured_image);
  const categoryName = normalizeText(data.category);
  const categorySlug = normalizeText(data.category_slug) || slugify(categoryName);
  const authorName = normalizeText(data.author) || "Editorial Team";
  const authorAvatar = normalizeText(data.author_avatar);
  const authorBio = normalizeText(data.author_bio);
  const seoTitle = normalizeText(data.seo_title) || normalizeText(data.title_en);
  const seoDescription = normalizeText(data.seo_description) || buildExcerpt(contentEn);

  return {
    ...data,
    content_blocks: blocks,
    content_en: contentEn,
    content_bn: contentBn,
    excerpt_en: normalizeText(data.excerpt_en) || buildExcerpt(contentEn),
    excerpt_bn: normalizeText(data.excerpt_bn) || buildExcerpt(contentBn),
    subtitle_en: normalizeText(data.excerpt_en) || buildExcerpt(contentEn),
    subtitle_bn: normalizeText(data.excerpt_bn) || buildExcerpt(contentBn),
    category: {
      id: normalizeObjectId(data.category_id) || categorySlug,
      name: categoryName,
      slug: categorySlug,
    },
    category_name: categoryName,
    category_slug: categorySlug,
    thumbnail,
    featured_image: thumbnail,
    author: {
      id: normalizeObjectId(data.author_id) || slugify(authorName) || "editorial-team",
      name: authorName,
      avatar: authorAvatar,
      bio: authorBio,
    },
    author_name: authorName,
    author_avatar: authorAvatar,
    author_bio: authorBio,
    seo: {
      meta_title: seoTitle,
      meta_description: seoDescription,
    },
    seo_title: seoTitle,
    seo_description: seoDescription,
    read_time: normalizeText(data.read_time) || estimateReadTime(blocks),
    published_at: publishedAt ? publishedAt.toISOString() : null,
  };
}

async function buildCategoryUsageMap() {
  const blogs = await BlogModel.find().select("category category_id category_slug publish_status");
  const usage = new Map<
    string,
    { usage_count: number; published_count: number }
  >();

  for (const item of blogs) {
    const data = item.toJSON() as Record<string, unknown>;
    const key =
      normalizeObjectId(data.category_id) ||
      normalizeText(data.category_slug) ||
      normalizeText(data.category);

    if (!key) {
      continue;
    }

    const current = usage.get(key) ?? {
      usage_count: 0,
      published_count: 0,
    };

    current.usage_count += 1;
    if (data.publish_status === "published") {
      current.published_count += 1;
    }

    usage.set(key, current);
  }

  return usage;
}

async function buildAuthorUsageMap() {
  const blogs = await BlogModel.find().select("author author_id publish_status");
  const usage = new Map<
    string,
    { usage_count: number; published_count: number }
  >();

  for (const item of blogs) {
    const data = item.toJSON() as Record<string, unknown>;
    const key = normalizeObjectId(data.author_id) || normalizeText(data.author);

    if (!key) {
      continue;
    }

    const current = usage.get(key) ?? {
      usage_count: 0,
      published_count: 0,
    };

    current.usage_count += 1;
    if (data.publish_status === "published") {
      current.published_count += 1;
    }

    usage.set(key, current);
  }

  return usage;
}

async function normalizeBlogPayload(
  payload: Record<string, unknown>,
  fallback?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const titleEn = normalizeText(payload.title_en ?? fallback?.title_en);
  const titleBn = normalizeText(payload.title_bn ?? fallback?.title_bn);
  const slug = slugify(normalizeText(payload.slug ?? fallback?.slug ?? titleEn));
  const blocks = normalizeContentBlocks(
    payload.content_blocks ?? fallback?.content_blocks,
    payload.content_en ?? fallback?.content_en,
    payload.content_bn ?? fallback?.content_bn,
  );

  if (!blocks.length) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Blog content must contain at least one block");
  }

  const resolvedCategory = await resolveCategory({
    ...parseCategoryReference(fallback?.category),
    ...parseCategoryReference(payload.category),
    id: normalizeObjectId(payload.category_id ?? fallback?.category_id),
    name:
      normalizeText(
        isRecord(payload.category) ? payload.category.name ?? payload.category.title : payload.category,
      ) ||
      normalizeText(
        isRecord(fallback?.category)
          ? fallback?.category.name ?? fallback?.category.title
          : fallback?.category,
      ) ||
      normalizeText(payload.category ?? fallback?.category),
    slug: normalizeText(payload.category_slug ?? fallback?.category_slug),
  });

  if (!resolvedCategory.id) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Category is required");
  }

  const resolvedAuthor = await resolveAuthor({
    ...parseAuthorReference(fallback?.author),
    ...parseAuthorReference(payload.author),
    id: normalizeObjectId(payload.author_id ?? fallback?.author_id),
    name:
      normalizeText(isRecord(payload.author) ? payload.author.name : payload.author) ||
      normalizeText(isRecord(fallback?.author) ? fallback?.author.name : fallback?.author) ||
      normalizeText(payload.author ?? fallback?.author),
    avatar:
      normalizeText(payload.author_avatar) ||
      normalizeText(isRecord(payload.author) ? payload.author.avatar : undefined) ||
      normalizeText(fallback?.author_avatar) ||
      normalizeText(isRecord(fallback?.author) ? fallback?.author.avatar : undefined),
    bio:
      normalizeText(payload.author_bio) ||
      normalizeText(isRecord(payload.author) ? payload.author.bio : undefined) ||
      normalizeText(fallback?.author_bio) ||
      normalizeText(isRecord(fallback?.author) ? fallback?.author.bio : undefined),
  });

  if (!resolvedAuthor.id) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Author is required");
  }

  const contentEn = serializeBlocksToText(blocks, "en");
  const contentBn = serializeBlocksToText(blocks, "bn");
  const thumbnail = normalizeText(
    payload.thumbnail ??
      payload.featured_image ??
      fallback?.thumbnail ??
      fallback?.featured_image,
  );
  const publishStatus = normalizeBlogStatus(
    payload.publish_status ?? fallback?.publish_status,
    "draft",
  );
  const seoSource = isRecord(payload.seo)
    ? payload.seo
    : isRecord(fallback?.seo)
      ? fallback.seo
      : undefined;
  const seoTitle =
    normalizeText(payload.seo_title ?? seoSource?.meta_title ?? fallback?.seo_title) || titleEn;
  const seoDescription =
    normalizeText(
      payload.seo_description ?? seoSource?.meta_description ?? fallback?.seo_description,
    ) || buildExcerpt(contentEn);
  const excerptEn =
    normalizeText(payload.excerpt_en ?? fallback?.excerpt_en) || buildExcerpt(contentEn);
  const excerptBn =
    normalizeText(payload.excerpt_bn ?? fallback?.excerpt_bn) || buildExcerpt(contentBn);

  return {
    title_en: titleEn,
    title_bn: titleBn,
    content_blocks: blocks,
    content_en: contentEn,
    content_bn: contentBn,
    excerpt_en: excerptEn,
    excerpt_bn: excerptBn,
    category_id: resolvedCategory.id,
    category: resolvedCategory.name,
    category_slug: resolvedCategory.slug,
    tags: normalizeTags(payload, fallback),
    thumbnail,
    featured_image: thumbnail,
    seo_title: seoTitle,
    seo_description: seoDescription,
    slug,
    author_id: resolvedAuthor.id,
    author: resolvedAuthor.name,
    author_avatar: resolvedAuthor.avatar,
    author_bio: resolvedAuthor.bio,
    publish_status: publishStatus,
    published_at: resolvePublishedAt(payload, fallback, publishStatus),
    read_time: estimateReadTime(blocks),
  };
}

export const blogService = {
  async listBlogs() {
    await syncBlogRelationships();
    const items = await BlogModel.find().sort({ updatedAt: -1 });
    return items.map((item) => formatBlogJson(item));
  },

  async getBlogById(id: string) {
    await syncBlogRelationships();
    const item = await BlogModel.findById(id);
    if (!item) {
      throw new AppError(StatusCodes.NOT_FOUND, "Blog not found");
    }

    return formatBlogJson(item);
  },

  async createBlog(payload: Record<string, unknown>) {
    const normalized = await normalizeBlogPayload(payload);
    const item = await BlogModel.create(normalized);
    return formatBlogJson(item);
  },

  async updateBlog(id: string, payload: Record<string, unknown>) {
    const existing = await BlogModel.findById(id);
    if (!existing) {
      throw new AppError(StatusCodes.NOT_FOUND, "Blog not found");
    }

    const normalized = await normalizeBlogPayload(
      payload,
      existing.toJSON() as Record<string, unknown>,
    );
    existing.set(normalized);
    const item = await existing.save();
    return formatBlogJson(item);
  },

  async deleteBlog(id: string) {
    const item = await BlogModel.findById(id);
    if (!item) {
      throw new AppError(StatusCodes.NOT_FOUND, "Blog not found");
    }

    await item.deleteOne();
    return true;
  },

  async setPublishStatus(id: string, publish_status: "draft" | "published" | "archived") {
    const item = await BlogModel.findById(id);
    if (!item) {
      throw new AppError(StatusCodes.NOT_FOUND, "Blog not found");
    }

    item.publish_status = publish_status;
    if (publish_status === "published" && !item.published_at) {
      item.published_at = new Date();
    }

    await item.save();
    return formatBlogJson(item);
  },

  async bulkDelete(ids: string[]) {
    await BlogModel.deleteMany({ _id: { $in: ids } });
    return true;
  },

  async listCategories() {
    await syncMissingCategoriesFromBlogs();
    const usageMap = await buildCategoryUsageMap();
    const items = await BlogCategoryModel.find().sort({ title: 1 });

    return items.map((item) => {
      const data = item.toJSON() as Record<string, unknown>;
      const usage =
        usageMap.get(String(data.id ?? "")) ??
        usageMap.get(normalizeText(data.slug)) ??
        usageMap.get(normalizeText(data.title));

      return {
        ...data,
        name: normalizeText(data.title),
        usage_count: usage?.usage_count ?? 0,
        published_count: usage?.published_count ?? 0,
      };
    });
  },

  async createCategory(payload: Record<string, unknown>) {
    const title = normalizeText(payload.title);
    const slug = slugify(normalizeText(payload.slug) || title) || createFallbackSlug("category");

    if (!title) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Category title is required");
    }

    const existing = await BlogCategoryModel.findOne({ slug });
    if (existing) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Category slug already exists");
    }

    const item = await BlogCategoryModel.create({
      title,
      slug,
      description: normalizeText(payload.description),
      publish_status: normalizeCategoryStatus(payload.publish_status, "published"),
    });

    return {
      ...(item.toJSON() as Record<string, unknown>),
      name: item.title,
      usage_count: 0,
      published_count: 0,
    };
  },

  async updateCategory(id: string, payload: Record<string, unknown>) {
    const item = await BlogCategoryModel.findById(id);
    if (!item) {
      throw new AppError(StatusCodes.NOT_FOUND, "Category not found");
    }

    const previousTitle = item.title;
    const previousSlug = item.slug;
    const nextTitle = normalizeText(payload.title) || item.title;
    const nextSlug =
      slugify(normalizeText(payload.slug) || nextTitle || item.slug) || item.slug;

    if (!nextTitle || !nextSlug) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Category title is required");
    }

    const conflictingCategory = await BlogCategoryModel.findOne({ slug: nextSlug });
    if (conflictingCategory && String(conflictingCategory.id) !== id) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Category slug already exists");
    }

    item.title = nextTitle;
    item.slug = nextSlug;
    item.description =
      typeof payload.description === "undefined"
        ? item.description
        : normalizeText(payload.description);
    item.publish_status = normalizeCategoryStatus(payload.publish_status, item.publish_status);
    await item.save();

    if (previousSlug !== nextSlug || previousTitle !== nextTitle) {
      await BlogModel.updateMany(
        {
          $or: [
            { category_id: id },
            { category_slug: previousSlug },
            { category: previousTitle },
          ],
        },
        {
          $set: {
            category_id: id,
            category: nextTitle,
            category_slug: nextSlug,
          },
        },
      );
    }

    const usageMap = await buildCategoryUsageMap();
    const usage =
      usageMap.get(String(item.id)) ??
      usageMap.get(item.slug) ??
      usageMap.get(item.title);

    return {
      ...(item.toJSON() as Record<string, unknown>),
      name: item.title,
      usage_count: usage?.usage_count ?? 0,
      published_count: usage?.published_count ?? 0,
    };
  },

  async bulkDeleteCategories(ids: string[]) {
    const categories = await BlogCategoryModel.find({
      _id: { $in: ids },
    });

    const categoryIds = categories.map((item) => String(item.id));
    const categoryTitles = categories.map((item) => item.title);
    const categorySlugs = categories.map((item) => item.slug);
    const assignedCount = await BlogModel.countDocuments({
      $or: [
        { category_id: { $in: categoryIds } },
        { category_slug: { $in: categorySlugs } },
        { category: { $in: categoryTitles } },
      ],
    });

    if (assignedCount > 0) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Remove blog posts from these categories before deleting them",
      );
    }

    await BlogCategoryModel.deleteMany({ _id: { $in: ids } });
    return true;
  },

  async listAuthors() {
    await syncMissingAuthorsFromBlogs();
    const usageMap = await buildAuthorUsageMap();
    const items = await BlogAuthorModel.find().sort({ name: 1 });

    return items.map((item) => {
      const data = item.toJSON() as Record<string, unknown>;
      const usage =
        usageMap.get(String(data.id ?? "")) ??
        usageMap.get(normalizeText(data.name));

      return {
        ...data,
        usage_count: usage?.usage_count ?? 0,
        published_count: usage?.published_count ?? 0,
      };
    });
  },

  async createAuthor(payload: Record<string, unknown>) {
    const name = normalizeText(payload.name);
    const slug = slugify(name) || createFallbackSlug("author");

    if (!name) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Author name is required");
    }

    const existing = await BlogAuthorModel.findOne({
      $or: [{ slug }, { name }],
    });
    if (existing) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Author already exists");
    }

    const item = await BlogAuthorModel.create({
      name,
      slug,
      avatar: normalizeText(payload.avatar),
      bio: normalizeText(payload.bio),
    });

    return {
      ...(item.toJSON() as Record<string, unknown>),
      usage_count: 0,
      published_count: 0,
    };
  },

  async updateAuthor(id: string, payload: Record<string, unknown>) {
    const item = await BlogAuthorModel.findById(id);
    if (!item) {
      throw new AppError(StatusCodes.NOT_FOUND, "Author not found");
    }

    const previousName = item.name;
    const nextName = normalizeText(payload.name) || item.name;
    const nextSlug = slugify(nextName) || item.slug || createFallbackSlug("author");

    const conflictingAuthor = await BlogAuthorModel.findOne({ slug: nextSlug });
    if (conflictingAuthor && String(conflictingAuthor.id) !== id) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Author name already exists");
    }

    item.name = nextName;
    item.slug = nextSlug;
    item.avatar =
      typeof payload.avatar === "undefined" ? item.avatar : normalizeText(payload.avatar);
    item.bio = typeof payload.bio === "undefined" ? item.bio : normalizeText(payload.bio);
    await item.save();

    await BlogModel.updateMany(
      {
        $or: [{ author_id: id }, { author: previousName }],
      },
      {
        $set: {
          author_id: id,
          author: item.name,
          author_avatar: item.avatar,
          author_bio: item.bio,
        },
      },
    );

    const usageMap = await buildAuthorUsageMap();
    const usage =
      usageMap.get(String(item.id)) ??
      usageMap.get(item.name) ??
      usageMap.get(previousName);

    return {
      ...(item.toJSON() as Record<string, unknown>),
      usage_count: usage?.usage_count ?? 0,
      published_count: usage?.published_count ?? 0,
    };
  },

  async deleteAuthor(id: string) {
    const item = await BlogAuthorModel.findById(id);
    if (!item) {
      throw new AppError(StatusCodes.NOT_FOUND, "Author not found");
    }

    const assignedCount = await BlogModel.countDocuments({
      $or: [{ author_id: id }, { author: item.name }],
    });

    if (assignedCount > 0) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Reassign blog posts from this author before deleting it",
      );
    }

    await item.deleteOne();
    return true;
  },

  async bulkDeleteAuthors(ids: string[]) {
    const authors = await BlogAuthorModel.find({
      _id: { $in: ids },
    });

    const authorIds = authors.map((item) => String(item.id));
    const authorNames = authors.map((item) => item.name);
    const assignedCount = await BlogModel.countDocuments({
      $or: [
        { author_id: { $in: authorIds } },
        { author: { $in: authorNames } },
      ],
    });

    if (assignedCount > 0) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Reassign blog posts from these authors before deleting them",
      );
    }

    await BlogAuthorModel.deleteMany({ _id: { $in: ids } });
    return true;
  },
};
