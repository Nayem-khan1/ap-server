import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/app-error";
import {
  getPaginationMeta,
  getPaginationOptions,
  PaginationMeta,
} from "../../utils/pagination";
import { CourseCategoryModel, CourseModel, CourseModuleModel } from "../course/model";
import { BlogModel } from "../blog/model";
import { blogService } from "../blog/service";
import { resolveEnrollmentPricing } from "../enrollment/workflow";
import { EventModel } from "../event/model";
import { LessonContentModel, LessonModel } from "../lesson/model";
import { UserModel } from "../user/model";
import { IssuedCertificateModel } from "../certificate/model";
import { certificateService } from "../certificate/service";
import {
  ListBlogCategoriesQuery,
  ListBlogsQuery,
  ListCourseCategoriesQuery,
  ListCoursesQuery,
  ListEventsQuery,
  ListInstructorsQuery,
  ListTestimonialsQuery,
} from "./public.validation";

type Language = "bn" | "en";

interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

function localizeCourse(course: Record<string, unknown>, lang: Language) {
  const isBangla = lang === "bn";

  return {
    ...course,
    title: isBangla ? course.title_bn : course.title_en,
    subtitle: isBangla ? course.subtitle_bn : course.subtitle_en,
    description: isBangla ? course.description_bn : course.description_en,
    requirements: isBangla ? course.requirements_bn : course.requirements_en,
    learning_objectives: isBangla
      ? course.learning_objectives_bn
      : course.learning_objectives_en,
    targeted_audience: isBangla
      ? course.targeted_audience_bn
      : course.targeted_audience_en,
  };
}

function localizeCourseModule(
  module: Record<string, unknown>,
  lang: Language,
): Record<string, unknown> {
  return {
    id: String(module.id ?? ""),
    title: lang === "bn" ? module.title_bn : module.title_en,
    title_en: module.title_en,
    title_bn: module.title_bn,
    order_no: module.order_no,
  };
}

function localizeCourseLesson(
  lesson: Record<string, unknown>,
  lang: Language,
  isPreview: boolean,
): Record<string, unknown> {
  return {
    id: String(lesson.id ?? ""),
    title: lang === "bn" ? lesson.title_bn : lesson.title_en,
    title_en: lesson.title_en,
    title_bn: lesson.title_bn,
    order_no: lesson.order_no,
    is_preview: isPreview,
  };
}

function mapInstructorProfile(user: Record<string, unknown>): Record<string, unknown> {
  return {
    id: String(user.id ?? ""),
    name: String(user.name ?? ""),
    bio: String(user.bio ?? ""),
    avatar: String(user.avatar ?? ""),
    specialization: String(user.specialization ?? ""),
  };
}

async function listVisibleCourseModules(courseId: string) {
  const publishedModules = await CourseModuleModel.find({
    course_id: courseId,
    publish_status: "published",
  }).sort({ order_no: 1 });

  if (publishedModules.length > 0) {
    return publishedModules;
  }

  return CourseModuleModel.find({ course_id: courseId }).sort({ order_no: 1 });
}

function localizeCourseCategory(
  category: Record<string, unknown>,
  lang: Language,
): Record<string, unknown> {
  return {
    ...category,
    title: lang === "bn" ? category.title_bn : category.title_en,
    description: lang === "bn" ? category.description_bn : category.description_en,
  };
}

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildExcerpt(value: string, maxLength = 180): string {
  const plain = value.replace(/\s+/g, " ").trim();
  if (!plain) return "";
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).replace(/\s+\S*$/, "").trimEnd()}...`;
}

function resolveBlogCategory(blog: Record<string, unknown>) {
  const rawCategory = isRecord(blog.category) ? blog.category : null;
  const name = normalizeText(rawCategory?.name ?? rawCategory?.title ?? blog.category);
  const slug = normalizeText(rawCategory?.slug ?? blog.category_slug) || slugify(name);
  const id = normalizeText(rawCategory?.id ?? blog.category_id) || slug;

  return {
    id,
    name,
    slug,
  };
}

function resolveBlogAuthor(blog: Record<string, unknown>) {
  const rawAuthor = isRecord(blog.author) ? blog.author : null;
  const name = normalizeText(rawAuthor?.name ?? blog.author) || "Editorial Team";
  const avatar = normalizeText(rawAuthor?.avatar ?? blog.author_avatar);
  const bio = normalizeText(rawAuthor?.bio ?? blog.author_bio);
  const id = normalizeText(rawAuthor?.id ?? blog.author_id) || slugify(name) || "editorial-team";

  return {
    id,
    name,
    avatar,
    bio,
  };
}

function resolveBlogSeo(blog: Record<string, unknown>) {
  const rawSeo = isRecord(blog.seo) ? blog.seo : null;

  return {
    meta_title: normalizeText(rawSeo?.meta_title ?? blog.seo_title),
    meta_description: normalizeText(rawSeo?.meta_description ?? blog.seo_description),
  };
}

function localizeBlogBlocks(
  blog: Record<string, unknown>,
  lang: Language,
): Array<Record<string, unknown>> {
  const rawBlocks = Array.isArray(blog.content_blocks) ? blog.content_blocks : [];

  if (rawBlocks.length > 0) {
    const localizedBlocks: Array<Record<string, unknown>> = [];

    rawBlocks.forEach((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return;
      }

      const block = item as Record<string, unknown>;
      const type = String(block.type ?? "");

      if (type === "image") {
        const url = normalizeText(block.url);
        if (!url) return;

        localizedBlocks.push({
          type: "image",
          url,
          caption: normalizeText(lang === "bn" ? block.caption_bn : block.caption_en),
        });
        return;
      }

      if (type === "heading" || type === "text" || type === "quote") {
        const value = normalizeText(lang === "bn" ? block.value_bn : block.value_en);
        if (!value) return;

        const localizedBlock: Record<string, unknown> = {
          type,
          value,
        };

        if (type === "heading") {
          localizedBlock.level = Math.min(3, Math.max(1, Number(block.level ?? 2) || 2));
        }

        if (type === "text") {
          const richText = lang === "bn" ? block.rich_text_bn : block.rich_text_en;
          if (richText && typeof richText === "object" && !Array.isArray(richText)) {
            localizedBlock.rich_text = richText;
          }
        }

        localizedBlocks.push(localizedBlock);
      }
    });

    return localizedBlocks;
  }

  const legacyContent = normalizeText(lang === "bn" ? blog.content_bn : blog.content_en);
  if (!legacyContent) {
    return [];
  }

  return legacyContent
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({
      type: "text",
      value: paragraph,
    }));
}

function blocksToText(blocks: Array<Record<string, unknown>>): string {
  return blocks
    .map((block) =>
      block.type === "image"
        ? normalizeText(block.caption)
        : normalizeText(block.value),
    )
    .filter(Boolean)
    .join("\n\n");
}

function localizeBlog(blog: Record<string, unknown>, lang: Language) {
  const contentBlocks = localizeBlogBlocks(blog, lang);
  const content = blocksToText(contentBlocks);
  const category = resolveBlogCategory(blog);
  const author = resolveBlogAuthor(blog);
  const thumbnail = normalizeText(blog.thumbnail ?? blog.featured_image);
  const excerpt =
    normalizeText(lang === "bn" ? blog.excerpt_bn : blog.excerpt_en) ||
    buildExcerpt(content);
  const subtitle =
    normalizeText(lang === "bn" ? blog.subtitle_bn : blog.subtitle_en) ||
    excerpt;

  return {
    ...blog,
    title: lang === "bn" ? blog.title_bn : blog.title_en,
    subtitle,
    content_blocks: contentBlocks,
    content,
    excerpt,
    category,
    category_name: category.name,
    category_slug: category.slug,
    author,
    author_name: author.name,
    author_avatar: author.avatar,
    author_bio: author.bio,
    thumbnail,
    featured_image: thumbnail,
    seo: resolveBlogSeo(blog),
    published_at: blog.published_at ?? blog.updated_at ?? blog.created_at,
    read_time: normalizeText(blog.read_time) || "1 min read",
  };
}

function localizeEvent(eventItem: Record<string, unknown>, lang: Language) {
  return {
    ...eventItem,
    title: lang === "bn" ? eventItem.title_bn : eventItem.title_en,
    description:
      lang === "bn" ? eventItem.description_bn : eventItem.description_en,
  };
}

export const publicService = {
  async listCourses(
    query: ListCoursesQuery,
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const { page, page_size, skip } = getPaginationOptions(query);

    const filter: Record<string, unknown> = {
      publish_status: "published",
    };

    if (query.category_id) {
      filter.category_id = query.category_id;
    }

    if (query.price_type === "free") {
      filter.is_free = true;
    }

    if (query.price_type === "paid") {
      filter.is_free = false;
    }

    if (query.popular_only) {
      filter.is_popular = true;
    }

    if (
      typeof query.min_price !== "undefined" ||
      typeof query.max_price !== "undefined"
    ) {
      const priceFilter: Record<string, number> = {};

      if (typeof query.min_price !== "undefined") {
        priceFilter.$gte = query.min_price;
      }

      if (typeof query.max_price !== "undefined") {
        priceFilter.$lte = query.max_price;
      }

      filter.price = priceFilter;
    }

    const [courses, total] = await Promise.all([
      CourseModel.find(filter)
        .sort({ is_popular: -1, updatedAt: -1 })
        .skip(skip)
        .limit(page_size),
      CourseModel.countDocuments(filter),
    ]);

    const categoryIds = Array.from(
      new Set(
        courses
          .map((course) => String(course.category_id || "").trim())
          .filter(Boolean),
      ),
    );

    const categories = categoryIds.length
      ? await CourseCategoryModel.find({
          _id: { $in: categoryIds },
          publish_status: "published",
        })
      : [];

    const categoryMap = new Map(
      categories.map((category) => {
        const item = category.toJSON() as Record<string, unknown>;
        return [String(item.id), item] as const;
      }),
    );

    const items = courses.map((course) => {
      const courseJson = course.toJSON() as Record<string, unknown>;
      const localizedCourse = localizeCourse(courseJson, query.lang as Language);
      const category = categoryMap.get(String(courseJson.category_id ?? ""));

      return {
        ...localizedCourse,
        category_title: category
          ? String(
              (query.lang === "bn" ? category.title_bn : category.title_en) ??
                courseJson.category_id ??
                "",
            )
          : String(courseJson.category_id ?? ""),
        category_slug: category ? String(category.slug ?? "") : "",
      };
    });

    return {
      items,
      pagination: getPaginationMeta(page, page_size, total),
    };
  },

  async listCourseCategories(
    query: ListCourseCategoriesQuery,
  ): Promise<Record<string, unknown>[]> {
    const publishedCategoryIds = await CourseModel.distinct("category_id", {
      publish_status: "published",
    });

    const categoryIds = publishedCategoryIds
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    if (!categoryIds.length) {
      return [];
    }

    const categories = await CourseCategoryModel.find({
      _id: { $in: categoryIds },
      publish_status: "published",
    }).sort({ updatedAt: -1 });

    const localizedItems = categories.map((category) =>
      localizeCourseCategory(
        category.toJSON() as Record<string, unknown>,
        query.lang as Language,
      ),
    );

    const foundCategoryIds = new Set(
      localizedItems.map((item) => String(item["id"] ?? "")),
    );
    const fallbackItems = categoryIds
      .filter((categoryId) => !foundCategoryIds.has(categoryId))
      .map((categoryId) => ({
        id: categoryId,
        slug: categoryId,
        title: categoryId,
        description: "",
      }));

    return [...localizedItems, ...fallbackItems];
  },

  async getCourseBySlug(
    slug: string,
    lang: Language,
  ): Promise<Record<string, unknown>> {
    const course = await CourseModel.findOne({
      slug,
      publish_status: "published",
    });

    if (!course) {
      throw new AppError(StatusCodes.NOT_FOUND, "Course not found");
    }

    const courseJson = course.toJSON() as Record<string, unknown>;
    const courseId = String(courseJson.id ?? "");
    const instructorIds = Array.isArray(courseJson.instructor_ids)
      ? Array.from(
          new Set(
            courseJson.instructor_ids
              .map((item) => String(item || "").trim())
              .filter(Boolean),
          ),
        )
      : [];
    const [category, modules, lessons, instructors] = await Promise.all([
      CourseCategoryModel.findOne({
        _id: String(courseJson.category_id ?? ""),
        publish_status: "published",
      }),
      listVisibleCourseModules(courseId),
      LessonModel.find({
        course_id: courseId,
        publish_status: "published",
      }).sort({ order_no: 1 }),
      instructorIds.length
        ? UserModel.find({
            _id: { $in: instructorIds },
            role: "instructor",
            status: "active",
            publish_status: "published",
          }).select("name bio avatar specialization publish_status")
        : Promise.resolve([]),
    ]);
    const lessonIds = lessons.map((lesson) => String(lesson.id));
    const previewContents = lessonIds.length
      ? await LessonContentModel.find({
          lesson_id: { $in: lessonIds },
          is_preview: true,
        }).select("lesson_id")
      : [];
    const categoryJson = category
      ? (category.toJSON() as Record<string, unknown>)
      : null;
    const previewLessonIds = new Set(
      previewContents.map((item) => String(item.lesson_id ?? "")),
    );
    const moduleOrder = new Map(
      modules.map((module) => [String(module.id), module.order_no]),
    );
    const visibleModuleIds = new Set(modules.map((module) => String(module.id)));
    const orderedLessons = lessons
      .filter((lesson) => visibleModuleIds.has(String(lesson.module_id)))
      .slice()
      .sort((left, right) => {
        const leftOrder =
          moduleOrder.get(String(left.module_id)) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder =
          moduleOrder.get(String(right.module_id)) ?? Number.MAX_SAFE_INTEGER;

        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        return left.order_no - right.order_no;
      });
    const lessonsByModuleId = new Map<string, typeof orderedLessons>();

    for (const lesson of orderedLessons) {
      const moduleId = String(lesson.module_id);
      const existing = lessonsByModuleId.get(moduleId) ?? [];
      existing.push(lesson);
      lessonsByModuleId.set(moduleId, existing);
    }

    const instructorById = new Map(
      instructors.map((item) => [String(item.id), mapInstructorProfile(item.toJSON())]),
    );
    const orderedInstructors = instructorIds
      .map((id) => instructorById.get(id))
      .filter(Boolean);
    const curriculum = modules.map((module) => {
      const moduleJson = localizeCourseModule(
        module.toJSON() as Record<string, unknown>,
        lang,
      );
      const moduleLessons = lessonsByModuleId.get(String(module.id)) ?? [];

      return {
        ...moduleJson,
        total_lessons: moduleLessons.length,
        lessons: moduleLessons.map((lesson) =>
          localizeCourseLesson(
            lesson.toJSON() as Record<string, unknown>,
            lang,
            previewLessonIds.has(String(lesson.id)),
          ),
        ),
      };
    });

    return {
      ...localizeCourse(courseJson, lang),
      category_title: categoryJson
        ? String((lang === "bn" ? categoryJson.title_bn : categoryJson.title_en) ?? "")
        : String(courseJson.category_id ?? ""),
      category_slug: categoryJson ? String(categoryJson.slug ?? "") : "",
      total_lessons:
        curriculum.reduce((sum, module) => sum + Number(module.total_lessons ?? 0), 0) ||
        Number(courseJson.total_lessons ?? 0),
      instructors: orderedInstructors,
      curriculum,
    };
  },

  async previewCoursePricing(
    courseId: string,
    payload: { coupon_code?: string },
  ): Promise<Record<string, unknown>> {
    const pricingResolution = await resolveEnrollmentPricing({
      course_id: courseId,
      coupon_code: payload.coupon_code,
      require_published_course: true,
    });

    return {
      course: {
        id: pricingResolution.course.id,
        title_en: pricingResolution.course.title_en,
        title_bn: pricingResolution.course.title_bn,
        is_free: pricingResolution.course.is_free,
        price: pricingResolution.course.price,
        discount_price: pricingResolution.course.discount_price,
      },
      pricing: pricingResolution.pricing,
    };
  },

  async listBlogs(
    query: ListBlogsQuery,
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const { page, page_size, skip } = getPaginationOptions(query);
    const filter: Record<string, unknown> = {
      publish_status: "published",
    };

    if (query.category) {
      filter.$or = [
        { category_id: query.category },
        { category: query.category },
        { category_slug: query.category },
      ];
    }

    if (query.tag) {
      filter.tags = { $in: [query.tag] };
    }

    const [blogs, total] = await Promise.all([
      BlogModel.find(filter)
        .sort({ published_at: -1, updatedAt: -1 })
        .skip(skip)
        .limit(page_size),
      BlogModel.countDocuments(filter),
    ]);

    const items = blogs.map((blog) =>
      localizeBlog(blog.toJSON() as Record<string, unknown>, query.lang as Language),
    );

    return {
      items,
      pagination: getPaginationMeta(page, page_size, total),
    };
  },

  async listBlogCategories(): Promise<Record<string, unknown>[]> {
    const categories = (await blogService.listCategories()) as Array<Record<string, unknown>>;

    return categories
      .filter(
        (category) =>
          normalizeText(category.publish_status) === "published" &&
          Number(category.published_count ?? 0) > 0,
      )
      .map((category) => ({
        id: String(category.id ?? ""),
        name: normalizeText(category.name ?? category.title),
        title: normalizeText(category.name ?? category.title),
        slug: normalizeText(category.slug),
        total_posts: Number(category.published_count ?? category.usage_count ?? 0),
      }))
      .sort((left, right) => left.title.localeCompare(right.title));
  },

  async listAuthors(): Promise<Record<string, unknown>[]> {
    const authors = (await blogService.listAuthors()) as Array<Record<string, unknown>>;

    return authors
      .filter((author) => Number(author.published_count ?? 0) > 0)
      .map((author) => ({
        id: String(author.id ?? ""),
        name: normalizeText(author.name),
        avatar: normalizeText(author.avatar),
        bio: normalizeText(author.bio),
        total_posts: Number(author.published_count ?? author.usage_count ?? 0),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  },

  async getBlogBySlug(
    slug: string,
    lang: Language,
  ): Promise<Record<string, unknown>> {
    const blog = await BlogModel.findOne({
      slug,
      publish_status: "published",
    });

    if (!blog) {
      throw new AppError(StatusCodes.NOT_FOUND, "Blog not found");
    }

    return localizeBlog(blog.toJSON() as Record<string, unknown>, lang);
  },

  async listEvents(
    query: ListEventsQuery,
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const { page, page_size, skip } = getPaginationOptions(query);

    const filter: Record<string, unknown> = {
      publish_status: "published",
    };

    const [events, total] = await Promise.all([
      EventModel.find(filter).sort({ event_date: 1 }).skip(skip).limit(page_size),
      EventModel.countDocuments(filter),
    ]);

    const items = events.map((eventItem) =>
      localizeEvent(
        eventItem.toJSON() as Record<string, unknown>,
        query.lang as Language,
      ),
    );

    return {
      items,
      pagination: getPaginationMeta(page, page_size, total),
    };
  },

  async listInstructors(
    query: ListInstructorsQuery,
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const { page, page_size, skip } = getPaginationOptions(query);

    const filter: Record<string, unknown> = {
      role: "instructor",
      status: "active",
      publish_status: "published",
    };

    const [instructors, total] = await Promise.all([
      UserModel.find(filter)
        .select("name email bio avatar specialization publish_status")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(page_size),
      UserModel.countDocuments(filter),
    ]);

    return {
      items: instructors.map((item) => item.toJSON()),
      pagination: getPaginationMeta(page, page_size, total),
    };
  },

  async listTestimonials(
    query: ListTestimonialsQuery,
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const { page, page_size, skip } = getPaginationOptions(query);

    const filter: Record<string, unknown> = {
      verification_status: "verified",
    };

    const [certificates, total] = await Promise.all([
      IssuedCertificateModel.find(filter)
        .sort({ issued_at: -1 })
        .skip(skip)
        .limit(page_size),
      IssuedCertificateModel.countDocuments(filter),
    ]);

    const items = certificates.map((item) => {
      const certificate = item.toJSON() as Record<string, unknown>;
      const studentName = String(certificate.student_name ?? "Student");
      const courseName = String(certificate.linked_course_name ?? "Astronomy Course");

      return {
        id: certificate.id,
        student_name: studentName,
        role: "Learner",
        content: `${studentName} successfully completed ${courseName} at Astronomy Pathshala.`,
        issued_at: certificate.issued_at,
        certificate_no: certificate.certificate_no,
      };
    });

    return {
      items,
      pagination: getPaginationMeta(page, page_size, total),
    };
  },

  async getEventBySlug(
    slug: string,
    lang: Language,
  ): Promise<Record<string, unknown>> {
    let eventItem = await EventModel.findOne({
      slug,
      publish_status: "published",
    });

    if (!eventItem && /^[a-fA-F0-9]{24}$/.test(slug)) {
      eventItem = await EventModel.findOne({
        _id: slug,
        publish_status: "published",
      });
    }

    if (!eventItem) {
      throw new AppError(StatusCodes.NOT_FOUND, "Event not found");
    }

    return localizeEvent(eventItem.toJSON() as Record<string, unknown>, lang);
  },

  async verifyCertificate(certificateNo: string): Promise<Record<string, unknown> | null> {
    return certificateService.verifyByCertificateNo(certificateNo);
  },
};
