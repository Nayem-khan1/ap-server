import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/app-error";
import {
  getPaginationMeta,
  getPaginationOptions,
  PaginationMeta,
} from "../../utils/pagination";
import { CourseModel } from "../course/model";
import { BlogModel } from "../blog/model";
import { EventModel } from "../event/model";
import { certificateService } from "../certificate/service";
import {
  ListBlogsQuery,
  ListCoursesQuery,
  ListEventsQuery,
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

    if (query.grade) {
      filter.grade = query.grade;
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
      CourseModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(page_size),
      CourseModel.countDocuments(filter),
    ]);

    const items = courses.map((course) =>
      localizeCourse(
        course.toJSON() as Record<string, unknown>,
        query.lang as Language,
      ),
    );

    return {
      items,
      pagination: getPaginationMeta(page, page_size, total),
    };
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

    return localizeCourse(course.toJSON() as Record<string, unknown>, lang);
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
