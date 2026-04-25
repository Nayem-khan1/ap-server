import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/app-error";
import { CourseCategoryModel, CourseModel, CourseModuleModel } from "./model";
import { CourseCategoryInput, CourseInput, ModuleInput } from "./schema";
import { LessonModel } from "../lesson/model";

function normalizeStringList(
  values: unknown,
): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "value" in item) {
        const value = (item as { value?: unknown }).value;
        return typeof value === "string" ? value : "";
      }
      return "";
    })
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCoursePayload(payload: Partial<CourseInput>): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...payload };

  if ("requirements_en" in payload) {
    normalized.requirements_en = normalizeStringList(payload.requirements_en);
  }

  if ("requirements_bn" in payload) {
    normalized.requirements_bn = normalizeStringList(payload.requirements_bn);
  }

  if ("learning_objectives_en" in payload) {
    normalized.learning_objectives_en = normalizeStringList(
      payload.learning_objectives_en,
    );
  }

  if ("learning_objectives_bn" in payload) {
    normalized.learning_objectives_bn = normalizeStringList(
      payload.learning_objectives_bn,
    );
  }

  if ("targeted_audience_en" in payload) {
    normalized.targeted_audience_en = normalizeStringList(payload.targeted_audience_en);
  }

  if ("targeted_audience_bn" in payload) {
    normalized.targeted_audience_bn = normalizeStringList(payload.targeted_audience_bn);
  }

  if ("faqs" in payload) {
    normalized.faqs = Array.isArray(payload.faqs) ? payload.faqs : [];
  }

  if ("thumbnail" in payload) {
    normalized.thumbnail = typeof payload.thumbnail === "string" ? payload.thumbnail : "";
  }

  return normalized;
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ensureUniqueCourseSlug(candidate: string): Promise<string> {
  const base = candidate || `course-${Date.now()}`;
  let slug = base;
  let attempt = 0;
  while (await CourseModel.exists({ slug })) {
    attempt += 1;
    slug = `${base}-${attempt}`;
  }
  return slug;
}

export const courseService = {
  async getCourseById(id: string) {
    const item = await CourseModel.findById(id);
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Course not found");
    return item.toJSON();
  },

  async listCourses(query: Record<string, unknown>) {
    const filter: Record<string, unknown> = {};

    if (typeof query.search === "string" && query.search.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { title_en: { $regex: search, $options: "i" } },
        { title_bn: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    if (typeof query.publish_status === "string") {
      filter.publish_status = query.publish_status;
    }

    const sortBy = typeof query.sort_by === "string" ? query.sort_by : "updatedAt";
    const sortOrder = query.sort_order === "asc" ? 1 : -1;

    const items = await CourseModel.find(filter).sort({ [sortBy]: sortOrder });
    return items.map((item) => item.toJSON());
  },

  async createCourse(payload: CourseInput) {
    const data = normalizeCoursePayload(payload);
    const rawSlug = typeof payload.slug === "string" ? payload.slug.trim() : "";
    const slugSource = rawSlug || toSlug(String(payload.title_en ?? ""));
    data.slug = await ensureUniqueCourseSlug(toSlug(slugSource));
    const course = await CourseModel.create(data);
    return course.toJSON();
  },

  async updateCourse(id: string, payload: Partial<CourseInput>) {
    const data = normalizeCoursePayload(payload);
    const course = await CourseModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!course) throw new AppError(StatusCodes.NOT_FOUND, "Course not found");
    return course.toJSON();
  },

  async setCoursePublishStatus(id: string, publish_status: "draft" | "published") {
    if (publish_status === "published") {
      const [moduleCount, lessonCount] = await Promise.all([
        CourseModuleModel.countDocuments({ course_id: id }),
        LessonModel.countDocuments({ course_id: id }),
      ]);

      if (moduleCount < 1) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          "At least one module is required before publishing the course",
        );
      }

      if (lessonCount < 1) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          "At least one lesson is required before publishing the course",
        );
      }

      await CourseModuleModel.updateMany(
        { course_id: id },
        { publish_status: "published" },
      );
    }

    const course = await CourseModel.findByIdAndUpdate(
      id,
      { publish_status },
      { new: true, runValidators: true },
    );
    if (!course) throw new AppError(StatusCodes.NOT_FOUND, "Course not found");
    return course.toJSON();
  },

  async bulkDeleteCourses(ids: string[]) {
    await CourseModel.deleteMany({ _id: { $in: ids } });
    await CourseModuleModel.deleteMany({ course_id: { $in: ids } });
    return true;
  },

  async listCategories() {
    const items = await CourseCategoryModel.find().sort({ updatedAt: -1 });
    return items.map((item) => item.toJSON());
  },

  async createCategory(payload: CourseCategoryInput) {
    const data = {
      ...payload,
      thumbnail: typeof payload.thumbnail === "string" ? payload.thumbnail : "",
    };
    const category = await CourseCategoryModel.create(data);
    return category.toJSON();
  },

  async updateCategory(id: string, payload: Partial<CourseCategoryInput>) {
    const data: Record<string, unknown> = { ...payload };
    if ("thumbnail" in data && typeof data.thumbnail !== "string") {
      data.thumbnail = "";
    }
    const category = await CourseCategoryModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!category) throw new AppError(StatusCodes.NOT_FOUND, "Category not found");
    return category.toJSON();
  },

  async setCategoryPublishStatus(
    id: string,
    publish_status: "draft" | "published",
  ) {
    const category = await CourseCategoryModel.findByIdAndUpdate(
      id,
      { publish_status },
      { new: true },
    );
    if (!category) throw new AppError(StatusCodes.NOT_FOUND, "Category not found");
    return category.toJSON();
  },

  async bulkDeleteCategories(ids: string[]) {
    await CourseCategoryModel.deleteMany({ _id: { $in: ids } });
    await CourseModel.updateMany(
      { category_id: { $in: ids } },
      { category_id: "" },
      { runValidators: false },
    );
    return true;
  },

  async listModulesByCourse(courseId: string) {
    const items = await CourseModuleModel.find({ course_id: courseId }).sort({
      order_no: 1,
    });
    return items.map((item) => item.toJSON());
  },

  async createModule(payload: ModuleInput) {
    const count = await CourseModuleModel.countDocuments({ course_id: payload.course_id });
    const item = await CourseModuleModel.create({
      course_id: payload.course_id,
      title_en: payload.title_en,
      title_bn: payload.title_bn,
      order_no: count + 1,
      publish_status: "published",
    });
    return item.toJSON();
  },

  async updateModule(id: string, payload: Partial<ModuleInput>) {
    const item = await CourseModuleModel.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Module not found");
    return item.toJSON();
  },

  async deleteModule(id: string) {
    await CourseModuleModel.findByIdAndDelete(id);
    return true;
  },
};
