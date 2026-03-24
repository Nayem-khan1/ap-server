import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/app-error";
import { IssuedCertificateModel } from "../certificate/model";
import { CourseModel, CourseModuleModel } from "../course/model";
import { EnrollmentModel, ProgressModel } from "../enrollment/model";
import { LessonModel } from "../lesson/model";
import { paymentService } from "../payment/service";
import { UserModel } from "../user/model";
import { UpdateStudentProfileInput } from "./schema";

type Language = "en" | "bn";

function resolveLocalizedCourseTitle(
  course: { title_en: string; title_bn: string },
  lang: Language,
): string {
  return lang === "bn" ? course.title_bn : course.title_en;
}

function resolveLocalizedLessonTitle(
  lesson: { title_en: string; title_bn: string },
  lang: Language,
): string {
  return lang === "bn" ? lesson.title_bn : lesson.title_en;
}

function resolveLocalizedModuleTitle(
  module: { title_en: string; title_bn: string },
  lang: Language,
): string {
  return lang === "bn" ? module.title_bn : module.title_en;
}

function resolveLocalizedCourseSubtitle(
  course: { subtitle_en: string; subtitle_bn: string },
  lang: Language,
): string {
  return lang === "bn" ? course.subtitle_bn : course.subtitle_en;
}

function resolvePayableAmount(input: {
  is_free: boolean;
  price: number;
  discount_price: number;
}): number {
  if (input.is_free) {
    return 0;
  }

  if (input.discount_price > 0 && input.discount_price < input.price) {
    return input.discount_price;
  }

  return input.price;
}

async function ensureStudent(userId: string) {
  const student = await UserModel.findOne({
    _id: userId,
    role: "student",
    status: "active",
  });

  if (!student) {
    throw new AppError(StatusCodes.NOT_FOUND, "Student not found");
  }

  return student;
}

async function syncEnrolledCourseCount(studentId: string): Promise<void> {
  const enrolledCoursesCount = await EnrollmentModel.countDocuments({
    student_id: studentId,
  });

  await UserModel.findByIdAndUpdate(studentId, {
    enrolled_courses_count: enrolledCoursesCount,
  });
}

async function buildStudentCourses(studentId: string, lang: Language) {
  const enrollments = await EnrollmentModel.find({ student_id: studentId }).sort({
    updatedAt: -1,
  });

  const courseIds = Array.from(new Set(enrollments.map((item) => item.course_id)));

  if (!courseIds.length) {
    return [];
  }

  const [courses, lessonCounts] = await Promise.all([
    CourseModel.find({ _id: { $in: courseIds }, publish_status: "published" }),
    LessonModel.aggregate<{ _id: string; total_lessons: number }>([
      {
        $match: {
          course_id: { $in: courseIds },
          publish_status: "published",
        },
      },
      {
        $group: {
          _id: "$course_id",
          total_lessons: { $sum: 1 },
        },
      },
    ]),
  ]);

  const courseById = new Map(courses.map((course) => [String(course.id), course]));
  const lessonsCountByCourseId = new Map(
    lessonCounts.map((item) => [String(item._id), item.total_lessons]),
  );

  return enrollments
    .map((enrollment) => {
      const course = courseById.get(String(enrollment.course_id));
      if (!course) {
        return null;
      }

      const totalLessons =
        lessonsCountByCourseId.get(String(enrollment.course_id)) ??
        course.total_lessons ??
        0;
      const completedLessonsCount = enrollment.completed_lessons.length;

      return {
        enrollment_id: enrollment.id,
        course_id: String(course.id),
        slug: course.slug,
        title: resolveLocalizedCourseTitle(course, lang),
        thumbnail: course.thumbnail,
        duration: course.duration,
        total_lessons: totalLessons,
        completed_lessons_count: completedLessonsCount,
        remaining_lessons: Math.max(0, totalLessons - completedLessonsCount),
        progress_percent: enrollment.progress_percent,
        status: enrollment.status,
        access_status: enrollment.access_status,
        last_activity_at: enrollment.updatedAt.toISOString(),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export const studentService = {
  async getProfile(userId: string) {
    const student = await ensureStudent(userId);
    return {
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      enrolled_courses_count: student.enrolled_courses_count,
      role: student.role,
      status: student.status,
    };
  },

  async updateProfile(userId: string, payload: UpdateStudentProfileInput) {
    const student = await ensureStudent(userId);

    if (typeof payload.name === "string") {
      student.name = payload.name.trim();
    }

    if (typeof payload.phone === "string") {
      student.phone = payload.phone.trim();
    }

    await student.save();

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      enrolled_courses_count: student.enrolled_courses_count,
      role: student.role,
      status: student.status,
    };
  },

  async getCourses(userId: string, lang: Language) {
    await ensureStudent(userId);
    return buildStudentCourses(userId, lang);
  },

  async getCourseRoadmap(userId: string, courseId: string, lang: Language) {
    await ensureStudent(userId);

    const [enrollment, course, modules, lessons] = await Promise.all([
      EnrollmentModel.findOne({
        student_id: userId,
        course_id: courseId,
      }),
      CourseModel.findOne({ _id: courseId, publish_status: "published" }),
      CourseModuleModel.find({
        course_id: courseId,
        publish_status: "published",
      }).sort({ order_no: 1 }),
      LessonModel.find({
        course_id: courseId,
        publish_status: "published",
      }).sort({ order_no: 1 }),
    ]);

    if (!enrollment) {
      throw new AppError(StatusCodes.NOT_FOUND, "Enrollment not found");
    }

    if (!course) {
      throw new AppError(StatusCodes.NOT_FOUND, "Published course not found");
    }

    const publishedModuleIds = new Set(modules.map((module) => String(module.id)));
    const moduleOrderById = new Map(
      modules.map((module) => [String(module.id), module.order_no]),
    );
    const orderedLessons = lessons
      .filter((lesson) => publishedModuleIds.has(String(lesson.module_id)))
      .slice()
      .sort((a, b) => {
        const leftModuleOrder =
          moduleOrderById.get(String(a.module_id)) ?? Number.MAX_SAFE_INTEGER;
        const rightModuleOrder =
          moduleOrderById.get(String(b.module_id)) ?? Number.MAX_SAFE_INTEGER;

        if (leftModuleOrder !== rightModuleOrder) {
          return leftModuleOrder - rightModuleOrder;
        }

        return a.order_no - b.order_no;
      });

    const completedSet = new Set(enrollment.completed_lessons);
    const completedLessonsCount = orderedLessons.filter((lesson) =>
      completedSet.has(lesson.id),
    ).length;
    const nextLesson =
      enrollment.access_status === "locked"
        ? null
        : orderedLessons.find((lesson) => !completedSet.has(lesson.id)) ?? null;
    const nextLessonId = nextLesson?.id ?? null;
    const lessonIndexById = new Map(
      orderedLessons.map((lesson, index) => [String(lesson.id), index]),
    );
    const nextLessonIndex =
      nextLessonId === null
        ? -1
        : lessonIndexById.get(String(nextLessonId)) ?? -1;
    const lessonsByModuleId = new Map<string, typeof orderedLessons>();
    const moduleById = new Map(modules.map((module) => [String(module.id), module]));

    for (const lesson of orderedLessons) {
      const moduleId = String(lesson.module_id);
      const existing = lessonsByModuleId.get(moduleId) ?? [];
      existing.push(lesson);
      lessonsByModuleId.set(moduleId, existing);
    }

    const roadmapModules = modules.map((module) => {
      const moduleLessons = lessonsByModuleId.get(String(module.id)) ?? [];
      const completedModuleLessonsCount = moduleLessons.filter((lesson) =>
        completedSet.has(lesson.id),
      ).length;
      const progressPercent = moduleLessons.length
        ? Math.round((completedModuleLessonsCount / moduleLessons.length) * 100)
        : 0;

      const status =
        moduleLessons.length > 0 && completedModuleLessonsCount === moduleLessons.length
          ? "completed"
          : enrollment.access_status === "locked"
            ? "locked"
            : moduleLessons.some((lesson) => lesson.id === nextLessonId) ||
                completedModuleLessonsCount > 0
              ? "current"
              : "upcoming";

      return {
        id: module.id,
        title: resolveLocalizedModuleTitle(module, lang),
        order_no: module.order_no,
        total_lessons: moduleLessons.length,
        completed_lessons_count: completedModuleLessonsCount,
        progress_percent: progressPercent,
        status,
        lessons: moduleLessons.map((lesson) => {
          const isCompleted = completedSet.has(lesson.id);
          const isCurrent = nextLessonId === lesson.id;
          const lessonIndex =
            lessonIndexById.get(String(lesson.id)) ?? Number.MAX_SAFE_INTEGER;

          return {
            id: lesson.id,
            title: resolveLocalizedLessonTitle(lesson, lang),
            order_no: lesson.order_no,
            module_id: lesson.module_id,
            status: isCompleted
              ? "completed"
              : enrollment.access_status === "locked"
                ? "locked"
                : isCurrent
                  ? "current"
                  : lessonIndex > nextLessonIndex
                    ? "upcoming"
                    : "available",
          };
        }),
      };
    });

    return {
      course: {
        enrollment_id: enrollment.id,
        course_id: String(course.id),
        slug: course.slug,
        title: resolveLocalizedCourseTitle(course, lang),
        subtitle: resolveLocalizedCourseSubtitle(course, lang),
        thumbnail: course.thumbnail,
        duration: course.duration,
        total_lessons: orderedLessons.length,
        completed_lessons_count: completedLessonsCount,
        remaining_lessons: Math.max(0, orderedLessons.length - completedLessonsCount),
        progress_percent: enrollment.progress_percent,
        status: enrollment.status,
        access_status: enrollment.access_status,
        last_activity_at: enrollment.updatedAt.toISOString(),
      },
      summary: {
        total_modules: roadmapModules.length,
        completed_modules: roadmapModules.filter((module) => module.status === "completed")
          .length,
        total_lessons: orderedLessons.length,
        completed_lessons: completedLessonsCount,
        next_lesson: nextLesson
          ? {
              id: nextLesson.id,
              title: resolveLocalizedLessonTitle(nextLesson, lang),
              order_no: nextLesson.order_no,
              module_id: nextLesson.module_id,
              module_title: resolveLocalizedModuleTitle(
                moduleById.get(String(nextLesson.module_id)) ?? {
                  title_en: "",
                  title_bn: "",
                },
                lang,
              ),
            }
          : null,
      },
      modules: roadmapModules,
    };
  },

  async getDashboard(userId: string, lang: Language) {
    const student = await ensureStudent(userId);
    const courses = await buildStudentCourses(userId, lang);

    const totalLessonsCompleted = courses.reduce(
      (sum, item) => sum + item.completed_lessons_count,
      0,
    );
    const totalLessons = courses.reduce((sum, item) => sum + item.total_lessons, 0);
    const completionRate =
      totalLessons > 0
        ? Number(((totalLessonsCompleted / totalLessons) * 100).toFixed(2))
        : 0;

    const issuedCertificates = await IssuedCertificateModel.countDocuments({
      student_name: student.name,
      verification_status: "verified",
    });

    const upcomingLessons = await Promise.all(
      courses.slice(0, 5).map(async (course) => {
        const lessons = await LessonModel.find({
          course_id: course.course_id,
          publish_status: "published",
        }).sort({ order_no: 1 });

        if (!lessons.length) {
          return null;
        }

        const enrollment = await EnrollmentModel.findById(course.enrollment_id);
        if (!enrollment) {
          return null;
        }

        const completedSet = new Set(enrollment.completed_lessons);
        const nextLesson = lessons.find((lesson) => !completedSet.has(lesson.id));

        if (!nextLesson) {
          return null;
        }

        return {
          course_id: course.course_id,
          course_title: course.title,
          lesson_id: nextLesson.id,
          lesson_title: resolveLocalizedLessonTitle(nextLesson, lang),
          order_no: nextLesson.order_no,
        };
      }),
    );

    return {
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
      },
      stats: {
        enrolled_courses: courses.length,
        total_lessons_completed: totalLessonsCompleted,
        total_lessons: totalLessons,
        completion_rate: completionRate,
        issued_certificates: issuedCertificates,
      },
      enrolled_courses: courses,
      upcoming_lessons: upcomingLessons.filter(
        (item): item is NonNullable<typeof item> => Boolean(item),
      ),
    };
  },

  async enrollInCourse(userId: string, courseId: string) {
    const [student, course] = await Promise.all([
      ensureStudent(userId),
      CourseModel.findOne({ _id: courseId, publish_status: "published" }),
    ]);

    if (!course) {
      throw new AppError(StatusCodes.NOT_FOUND, "Published course not found");
    }

    const existingEnrollment = await EnrollmentModel.findOne({
      student_id: student.id,
      course_id: course.id,
    });

    if (
      existingEnrollment &&
      (existingEnrollment.payment_status === "paid" ||
        existingEnrollment.payment_status === "free")
    ) {
      await syncEnrolledCourseCount(student.id);
      return {
        payment_required: false,
        already_enrolled: true,
        enrollment: existingEnrollment.toJSON(),
      };
    }

    if (course.is_free) {
      const enrollment = await EnrollmentModel.findOneAndUpdate(
        {
          student_id: student.id,
          course_id: course.id,
        },
        {
          student_id: student.id,
          student_name: student.name,
          course_id: course.id,
          course_name: course.title_en,
          enrolled_at: new Date().toISOString(),
          enrollment_type: "auto",
          payment_status: "free",
          progress_percent: existingEnrollment?.progress_percent ?? 0,
          completed_lessons: existingEnrollment?.completed_lessons ?? [],
          completed_at: existingEnrollment?.completed_at ?? null,
          status: "active",
          access_status: "active",
        },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      );

      await syncEnrolledCourseCount(student.id);

      return {
        payment_required: false,
        already_enrolled: false,
        enrollment: enrollment.toJSON(),
      };
    }

    const amount = resolvePayableAmount({
      is_free: course.is_free,
      price: course.price,
      discount_price: course.discount_price,
    });

    if (amount <= 0) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Course price must be greater than zero for paid enrollment",
      );
    }

    const payment = await paymentService.initBkashPayment({
      student_id: student.id,
      course_id: course.id,
      amount,
    });

    await syncEnrolledCourseCount(student.id);

    return {
      payment_required: true,
      already_enrolled: false,
      payment,
    };
  },

  async completeNextLesson(userId: string, courseId: string) {
    await ensureStudent(userId);

    const [enrollment, lessons] = await Promise.all([
      EnrollmentModel.findOne({
        student_id: userId,
        course_id: courseId,
      }),
      LessonModel.find({
        course_id: courseId,
        publish_status: "published",
      }).sort({ order_no: 1 }),
    ]);

    if (!enrollment) {
      throw new AppError(StatusCodes.NOT_FOUND, "Enrollment not found");
    }

    if (enrollment.access_status === "locked") {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Enrollment is locked. Please complete payment first",
      );
    }

    if (!lessons.length) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "No published lessons found for this course",
      );
    }

    const completedSet = new Set(enrollment.completed_lessons);
    const nextLesson = lessons.find((lesson) => !completedSet.has(lesson.id));

    if (!nextLesson) {
      return {
        completed_lesson_id: null,
        completed_lesson_title: null,
        progress_percent: enrollment.progress_percent,
        is_course_completed: enrollment.progress_percent >= 100,
        enrollment: enrollment.toJSON(),
      };
    }

    completedSet.add(nextLesson.id);
    enrollment.completed_lessons = Array.from(completedSet);
    enrollment.progress_percent = Math.min(
      100,
      Math.round((completedSet.size / lessons.length) * 100),
    );
    enrollment.status = enrollment.progress_percent >= 100 ? "completed" : "active";
    enrollment.completed_at =
      enrollment.progress_percent >= 100 ? new Date().toISOString() : null;
    enrollment.access_status = "active";

    await enrollment.save();

    await ProgressModel.findOneAndUpdate(
      {
        student_id: userId,
        course: enrollment.course_name,
        lesson: nextLesson.title_en,
      },
      {
        student_id: userId,
        student_name: enrollment.student_name,
        course: enrollment.course_name,
        lesson: nextLesson.title_en,
        current_step: "VIDEO",
        video_watch_percent: 100,
        quiz_score: 0,
        smart_note_generated: false,
        completion_status:
          enrollment.progress_percent >= 100 ? "completed" : "in_progress",
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );

    return {
      completed_lesson_id: nextLesson.id,
      completed_lesson_title: nextLesson.title_en,
      progress_percent: enrollment.progress_percent,
      is_course_completed: enrollment.progress_percent >= 100,
      enrollment: enrollment.toJSON(),
    };
  },
};
