import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/app-error";
import {
  getPaginationMeta,
  getPaginationOptions,
  PaginationMeta,
} from "../../utils/pagination";
import { CourseCategoryModel, CourseModel } from "../course/model";
import { BlogModel } from "../blog/model";
import { EventModel } from "../event/model";
import { UserModel } from "../user/model";
import { IssuedCertificateModel } from "../certificate/model";
import { certificateService } from "../certificate/service";
import {
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

function localizeBlog(blog: Record<string, unknown>, lang: Language) {
  return {
    ...blog,
    title: lang === "bn" ? blog.title_bn : blog.title_en,
    content: lang === "bn" ? blog.content_bn : blog.content_en,
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
    const category = await CourseCategoryModel.findOne({
      _id: String(courseJson.category_id ?? ""),
      publish_status: "published",
    });
    const categoryJson = category
      ? (category.toJSON() as Record<string, unknown>)
      : null;

    return {
      ...localizeCourse(courseJson, lang),
      category_title: categoryJson
        ? String((lang === "bn" ? categoryJson.title_bn : categoryJson.title_en) ?? "")
        : String(courseJson.category_id ?? ""),
      category_slug: categoryJson ? String(categoryJson.slug ?? "") : "",
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
      filter.category = query.category;
    }

    if (query.tag) {
      filter.tags = { $in: [query.tag] };
    }

    const [blogs, total] = await Promise.all([
      BlogModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(page_size),
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



