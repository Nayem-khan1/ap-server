import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/app-error";
import {
  CertificateTemplateModel,
  IssuedCertificateModel,
} from "../certificate/model";
import { certificateService } from "../certificate/service";
import { CourseModel, CourseModuleModel } from "../course/model";
import { EnrollmentModel, ProgressModel } from "../enrollment/model";
import { LessonContentModel, LessonModel } from "../lesson/model";
import { PaymentModel } from "../payment/model";
import { paymentService } from "../payment/service";
import { UserModel } from "../user/model";
import {
  LearningStep,
  StudentActivityModel,
  StudentLessonProgressModel,
} from "./model";
import {
  SubmitLessonQuizInput,
  UpdateLessonVideoProgressInput,
  UpdateStudentProfileInput,
} from "./schema";

type Language = "en" | "bn";

type LessonContentItem = {
  id: string;
  type: "video" | "pdf" | "quiz";
  order_no: number;
  unlock_condition: "auto_unlock" | "after_previous_completed" | "after_quiz_pass";
  is_preview: boolean;
  video: {
    url: string;
    duration: string;
    provider: string;
    thumbnail: string;
  } | null;
  pdf: {
    title: string;
    file_url: string;
    downloadable: boolean;
  } | null;
  quiz: {
    title: string;
    time_limit: number;
    pass_mark: number;
    questions: Array<{
      id: string;
      question: string;
      question_type: "MCQ" | "MULTIPLE_SELECT" | "TRUE_FALSE";
      options: string[];
      explanation: string;
    }>;
  } | null;
};

type DecoratedLessonContentItem = LessonContentItem & {
  status: "completed" | "available" | "locked";
  is_unlocked: boolean;
  is_completed: boolean;
};

type LessonProgressSnapshot = {
  lesson_id: string;
  module_id: string;
  video_watch_percent: number;
  video_completed: boolean;
  quiz_completed: boolean;
  quiz_score: number;
  note_completed: boolean;
  lesson_completed: boolean;
  current_step: LearningStep;
  completed_at: string | null;
};

type LessonRuntimeState = {
  lesson: {
    id: string;
    module_id: string;
    order_no: number;
    title_en: string;
    title_bn: string;
  };
  progress: LessonProgressSnapshot;
  contents: DecoratedLessonContentItem[];
  lesson_unlocked: boolean;
  status: "completed" | "current" | "locked";
};

type CourseProgressContext = {
  modules: Array<{
    id: string;
    title_en: string;
    title_bn: string;
    order_no: number;
  }>;
  orderedLessons: Array<{
    id: string;
    module_id: string;
    order_no: number;
    title_en: string;
    title_bn: string;
  }>;
  moduleById: Map<
    string,
    {
      id: string;
      title_en: string;
      title_bn: string;
      order_no: number;
    }
  >;
  lessonStates: LessonRuntimeState[];
  lessonStateById: Map<string, LessonRuntimeState>;
  progressByLessonId: Map<string, LessonProgressSnapshot>;
  currentLessonId: string | null;
  completedLessonsCount: number;
};

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

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function calculateProgressPercent(completedCount: number, totalCount: number): number {
  if (!totalCount) {
    return 0;
  }

  return Math.min(100, Math.round((completedCount / totalCount) * 100));
}

function toDateKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function normalizeCorrectAnswers(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .slice()
      .sort();
  }

  if (typeof value === "string") {
    return [value];
  }

  return [];
}

function isSubmittedAnswerCorrect(
  correctAnswer: unknown,
  submittedAnswers: string[],
): boolean {
  const expectedAnswers = normalizeCorrectAnswers(correctAnswer);
  const actualAnswers = Array.from(
    new Set(submittedAnswers.filter((item): item is string => typeof item === "string")),
  ).sort();

  if (expectedAnswers.length !== actualAnswers.length) {
    return false;
  }

  return expectedAnswers.every((answer, index) => answer === actualAnswers[index]);
}

function resolveLearningStep(input: {
  hasVideo: boolean;
  hasQuiz: boolean;
  hasNote: boolean;
  videoCompleted: boolean;
  quizCompleted: boolean;
  noteCompleted: boolean;
  lessonCompleted: boolean;
}): LearningStep {
  if (input.lessonCompleted) {
    return "completed";
  }

  if (input.hasVideo && !input.videoCompleted) {
    return "video";
  }

  if (input.hasQuiz && !input.quizCompleted) {
    return "quiz";
  }

  if (input.hasNote && !input.noteCompleted) {
    return "note";
  }

  if (input.hasNote) {
    return "note";
  }

  if (input.hasQuiz) {
    return "quiz";
  }

  if (input.hasVideo) {
    return "video";
  }

  return "completed";
}

function buildStudentCertificateFilter(student: {
  id?: string | null;
  name: string;
}) {
  const filters: Array<Record<string, unknown>> = [
    { student_id: { $exists: false }, student_name: student.name },
    { student_id: null, student_name: student.name },
  ];

  if (typeof student.id === "string" && student.id.trim()) {
    filters.unshift({ student_id: student.id });
  }

  return { $or: filters };
}

function buildStudentPaymentFilter(student: {
  id?: string | null;
  name: string;
}) {
  const filters: Array<Record<string, unknown>> = [
    { student_id: { $exists: false }, student_name: student.name },
    { student_id: null, student_name: student.name },
  ];

  if (typeof student.id === "string" && student.id.trim()) {
    filters.unshift({ student_id: student.id });
  }

  return { $or: filters };
}

function readLocalizedContentField(
  value: Record<string, unknown>,
  lang: Language,
  englishKey: string,
  banglaKey: string,
): string {
  const primaryKey = lang === "bn" ? banglaKey : englishKey;
  const fallbackKey = lang === "bn" ? englishKey : banglaKey;
  const primaryValue = value[primaryKey];
  const fallbackValue = value[fallbackKey];

  if (typeof primaryValue === "string" && primaryValue.trim()) {
    return primaryValue;
  }

  if (typeof fallbackValue === "string" && fallbackValue.trim()) {
    return fallbackValue;
  }

  return "";
}

function normalizeQuestionType(
  value: unknown,
): "MCQ" | "MULTIPLE_SELECT" | "TRUE_FALSE" {
  if (value === "MULTIPLE_SELECT" || value === "TRUE_FALSE") {
    return value;
  }

  return "MCQ";
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

type StudentEntity = Awaited<ReturnType<typeof ensureStudent>>;

async function syncEnrolledCourseCount(studentId: string): Promise<void> {
  const enrolledCoursesCount = await EnrollmentModel.countDocuments({
    student_id: studentId,
  });

  await UserModel.findByIdAndUpdate(studentId, {
    enrolled_courses_count: enrolledCoursesCount,
  });
}

async function buildStudentProfile(student: StudentEntity) {
  const enrolledCoursesCount = await EnrollmentModel.countDocuments({
    student_id: student.id,
  });

  return {
    id: student.id,
    name: student.name,
    email: student.email,
    phone: student.phone,
    avatar: student.avatar,
    enrolled_courses_count: enrolledCoursesCount,
    role: student.role,
    status: student.status,
  };
}

async function syncStudentNameReferences(
  studentId: string,
  previousName: string,
  nextName: string,
): Promise<void> {
  if (!previousName.trim() || previousName === nextName) {
    return;
  }

  await Promise.all([
    EnrollmentModel.updateMany({ student_id: studentId }, { student_name: nextName }),
    ProgressModel.updateMany({ student_id: studentId }, { student_name: nextName }),
    PaymentModel.updateMany(buildStudentPaymentFilter({ id: studentId, name: previousName }), {
      student_id: studentId,
      student_name: nextName,
    }),
    IssuedCertificateModel.updateMany(
      buildStudentCertificateFilter({ id: studentId, name: previousName }),
      {
        student_id: studentId,
        student_name: nextName,
      },
    ),
  ]);
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

function sortLessonsByModuleOrder<T extends { module_id: string; order_no: number }>(
  lessons: T[],
  moduleOrderById: Map<string, number>,
): T[] {
  return lessons.slice().sort((left, right) => {
    const leftModuleOrder =
      moduleOrderById.get(String(left.module_id)) ?? Number.MAX_SAFE_INTEGER;
    const rightModuleOrder =
      moduleOrderById.get(String(right.module_id)) ?? Number.MAX_SAFE_INTEGER;

    if (leftModuleOrder !== rightModuleOrder) {
      return leftModuleOrder - rightModuleOrder;
    }

    return left.order_no - right.order_no;
  });
}

async function getOrderedPublishedCourseLessons(courseId: string) {
  const [modules, lessons] = await Promise.all([
    listVisibleCourseModules(courseId),
    LessonModel.find({
      course_id: courseId,
      publish_status: "published",
    }).sort({ order_no: 1 }),
  ]);

  const visibleModuleIds = new Set(modules.map((module) => String(module.id)));
  const moduleOrderById = new Map(
    modules.map((module) => [String(module.id), module.order_no] as const),
  );

  const orderedLessons = sortLessonsByModuleOrder(
    lessons.filter((lesson) => visibleModuleIds.has(String(lesson.module_id))),
    moduleOrderById,
  );

  return {
    modules: modules.map((module) => ({
      id: String(module.id),
      title_en: module.title_en,
      title_bn: module.title_bn,
      order_no: module.order_no,
    })),
    orderedLessons: orderedLessons.map((lesson) => ({
      id: String(lesson.id),
      module_id: String(lesson.module_id),
      order_no: lesson.order_no,
      title_en: lesson.title_en,
      title_bn: lesson.title_bn,
    })),
  };
}

async function buildLessonContentsMap(lessonIds: string[], lang: Language) {
  const lessonContentsByLessonId = new Map<string, LessonContentItem[]>();

  if (!lessonIds.length) {
    return lessonContentsByLessonId;
  }

  const lessonContents = await LessonContentModel.find({
    lesson_id: { $in: lessonIds },
  }).sort({ order_no: 1 });

  for (const item of lessonContents) {
    if (item.type !== "video" && item.type !== "pdf" && item.type !== "quiz") {
      continue;
    }

    const lessonId = String(item.lesson_id);
    const currentItems = lessonContentsByLessonId.get(lessonId) ?? [];
    const videoData =
      item.video_data && typeof item.video_data === "object"
        ? (item.video_data as Record<string, unknown>)
        : null;
    const pdfData =
      item.pdf_data && typeof item.pdf_data === "object"
        ? (item.pdf_data as Record<string, unknown>)
        : null;
    const quizData =
      item.quiz_data && typeof item.quiz_data === "object"
        ? (item.quiz_data as Record<string, unknown>)
        : null;
    const rawQuestions = Array.isArray(quizData?.questions) ? quizData.questions : [];

    currentItems.push({
      id: String(item.id),
      type: item.type,
      order_no: item.order_no,
      unlock_condition: item.unlock_condition,
      is_preview: Boolean(item.is_preview),
      video:
        item.type === "video"
          ? {
              url: typeof videoData?.url === "string" ? videoData.url : "",
              duration:
                typeof videoData?.duration === "string" ? videoData.duration : "",
              provider:
                typeof videoData?.provider === "string" ? videoData.provider : "",
              thumbnail:
                typeof videoData?.thumbnail === "string"
                  ? videoData.thumbnail
                  : "",
            }
          : null,
      pdf:
        item.type === "pdf"
          ? {
              title: pdfData
                ? readLocalizedContentField(
                    pdfData,
                    lang,
                    "title_en",
                    "title_bn",
                  )
                : "",
              file_url:
                typeof pdfData?.file_url === "string" ? pdfData.file_url : "",
              downloadable: Boolean(pdfData?.downloadable),
            }
          : null,
      quiz:
        item.type === "quiz"
          ? {
              title: typeof quizData?.title === "string" ? quizData.title : "",
              time_limit:
                typeof quizData?.time_limit === "number" ? quizData.time_limit : 0,
              pass_mark:
                typeof quizData?.pass_mark === "number" ? quizData.pass_mark : 70,
              questions: rawQuestions.map((question, index) => {
                const value =
                  question && typeof question === "object"
                    ? (question as Record<string, unknown>)
                    : {};

                return {
                  id:
                    typeof value.id === "string"
                      ? value.id
                      : `${lessonId}-question-${index + 1}`,
                  question: readLocalizedContentField(
                    value,
                    lang,
                    "question_en",
                    "question_bn",
                  ),
                  question_type: normalizeQuestionType(value.question_type),
                  options: Array.isArray(value.options)
                    ? value.options.filter(
                        (option): option is string => typeof option === "string",
                      )
                    : [],
                  explanation: readLocalizedContentField(
                    value,
                    lang,
                    "explanation_en",
                    "explanation_bn",
                  ),
                };
              }),
            }
          : null,
    });

    lessonContentsByLessonId.set(lessonId, currentItems);
  }

  return lessonContentsByLessonId;
}

function buildLessonProgressSnapshot(input: {
  lesson: {
    id: string;
    module_id: string;
  };
  contents: LessonContentItem[];
  storedProgress:
    | {
        video_watch_percent: number;
        video_completed: boolean;
        quiz_completed: boolean;
        quiz_score: number;
        note_completed: boolean;
        lesson_completed: boolean;
        completed_at: string | null;
      }
    | undefined;
  completedSet: Set<string>;
}): LessonProgressSnapshot {
  const hasVideo = input.contents.some((content) => content.type === "video");
  const hasQuiz = input.contents.some((content) => content.type === "quiz");
  const hasNote = input.contents.some((content) => content.type === "pdf");
  const legacyCompleted = input.completedSet.has(input.lesson.id);
  const storedProgress = input.storedProgress;

  const videoWatchPercent = legacyCompleted
    ? 100
    : clampPercent(storedProgress?.video_watch_percent ?? 0);
  const lessonCompleted = legacyCompleted || Boolean(storedProgress?.lesson_completed);
  const videoCompleted =
    lessonCompleted ||
    !hasVideo ||
    Boolean(storedProgress?.video_completed) ||
    videoWatchPercent >= 100;
  const quizCompleted =
    lessonCompleted || !hasQuiz || Boolean(storedProgress?.quiz_completed);
  const noteCompleted =
    lessonCompleted || !hasNote || Boolean(storedProgress?.note_completed);
  const quizScore = hasQuiz
    ? legacyCompleted
      ? 100
      : clampPercent(storedProgress?.quiz_score ?? 0)
    : 0;

  return {
    lesson_id: input.lesson.id,
    module_id: input.lesson.module_id,
    video_watch_percent: videoWatchPercent,
    video_completed: videoCompleted,
    quiz_completed: quizCompleted,
    quiz_score: quizScore,
    note_completed: noteCompleted,
    lesson_completed: lessonCompleted,
    current_step: resolveLearningStep({
      hasVideo,
      hasQuiz,
      hasNote,
      videoCompleted,
      quizCompleted,
      noteCompleted,
      lessonCompleted,
    }),
    completed_at: lessonCompleted ? storedProgress?.completed_at ?? null : null,
  };
}

function decorateLessonContents(
  contents: LessonContentItem[],
  input: {
    lessonUnlocked: boolean;
    progress: LessonProgressSnapshot;
  },
): DecoratedLessonContentItem[] {
  const hasVideo = contents.some((content) => content.type === "video");
  const hasQuiz = contents.some((content) => content.type === "quiz");

  return contents.map((content) => {
    let isUnlocked = false;
    let isCompleted = false;

    if (content.type === "video") {
      isUnlocked = input.lessonUnlocked;
      isCompleted = input.progress.video_completed || input.progress.lesson_completed;
    }

    if (content.type === "quiz") {
      isUnlocked =
        input.lessonUnlocked &&
        (!hasVideo ||
          input.progress.video_completed ||
          input.progress.lesson_completed);
      isCompleted = input.progress.quiz_completed || input.progress.lesson_completed;
    }

    if (content.type === "pdf") {
      isUnlocked =
        input.lessonUnlocked &&
        (!hasVideo ||
          input.progress.video_completed ||
          input.progress.lesson_completed) &&
        (!hasQuiz ||
          input.progress.quiz_completed ||
          input.progress.lesson_completed);
      isCompleted = input.progress.note_completed || input.progress.lesson_completed;
    }

    return {
      ...content,
      status: isCompleted ? "completed" : isUnlocked ? "available" : "locked",
      is_unlocked: isUnlocked,
      is_completed: isCompleted,
    };
  });
}

async function buildCourseProgressContext(
  studentId: string,
  courseId: string,
  enrollment: {
    access_status: "active" | "locked";
    completed_lessons: string[];
  },
  lang: Language,
): Promise<CourseProgressContext> {
  const orderedCourseLessons = await getOrderedPublishedCourseLessons(courseId);
  const { modules, orderedLessons } = orderedCourseLessons;
  const lessonIds = orderedLessons.map((lesson) => lesson.id);

  const [storedProgressDocs, lessonContentsByLessonId] = await Promise.all([
    StudentLessonProgressModel.find({
      student_id: studentId,
      course_id: courseId,
    }),
    buildLessonContentsMap(lessonIds, lang),
  ]);

  const storedProgressByLessonId = new Map(
    storedProgressDocs.map((item) => [
      String(item.lesson_id),
      {
        video_watch_percent: item.video_watch_percent,
        video_completed: item.video_completed,
        quiz_completed: item.quiz_completed,
        quiz_score: item.quiz_score,
        note_completed: item.note_completed,
        lesson_completed: item.lesson_completed,
        completed_at: item.completed_at,
      },
    ]),
  );
  const completedSet = new Set(enrollment.completed_lessons);
  const lessonStates: LessonRuntimeState[] = [];
  const lessonStateById = new Map<string, LessonRuntimeState>();
  const progressByLessonId = new Map<string, LessonProgressSnapshot>();
  const moduleById = new Map(
    modules.map((module) => [module.id, module] as const),
  );

  let currentLessonId: string | null = null;
  let previousLessonCompleted = false;

  for (let index = 0; index < orderedLessons.length; index += 1) {
    const lesson = orderedLessons[index];
    const lessonContents = lessonContentsByLessonId.get(lesson.id) ?? [];
    const progress = buildLessonProgressSnapshot({
      lesson,
      contents: lessonContents,
      storedProgress: storedProgressByLessonId.get(lesson.id),
      completedSet,
    });
    const lessonUnlocked =
      enrollment.access_status !== "locked" &&
      (index === 0 || previousLessonCompleted);

    let status: LessonRuntimeState["status"] = "locked";
    if (progress.lesson_completed) {
      status = "completed";
    } else if (lessonUnlocked && currentLessonId === null) {
      status = "current";
      currentLessonId = lesson.id;
    }

    const state: LessonRuntimeState = {
      lesson,
      progress,
      contents: decorateLessonContents(lessonContents, {
        lessonUnlocked,
        progress,
      }),
      lesson_unlocked: lessonUnlocked,
      status,
    };

    lessonStates.push(state);
    lessonStateById.set(lesson.id, state);
    progressByLessonId.set(lesson.id, progress);
    previousLessonCompleted = progress.lesson_completed;
  }

  return {
    modules,
    orderedLessons,
    moduleById,
    lessonStates,
    lessonStateById,
    progressByLessonId,
    currentLessonId,
    completedLessonsCount: lessonStates.filter((state) => state.progress.lesson_completed)
      .length,
  };
}

async function syncLegacyProgressRecord(input: {
  studentId: string;
  studentName: string;
  courseName: string;
  lessonTitle: string;
  progress: LessonProgressSnapshot;
}) {
  await ProgressModel.findOneAndUpdate(
    {
      student_id: input.studentId,
      course: input.courseName,
      lesson: input.lessonTitle,
    },
    {
      student_id: input.studentId,
      student_name: input.studentName,
      course: input.courseName,
      lesson: input.lessonTitle,
      current_step:
        input.progress.current_step === "note"
          ? "SMART_NOTE"
          : input.progress.current_step.toUpperCase(),
      video_watch_percent: input.progress.video_watch_percent,
      quiz_score: input.progress.quiz_score,
      smart_note_generated: input.progress.note_completed,
      completion_status: input.progress.lesson_completed
        ? "completed"
        : input.progress.video_watch_percent > 0 ||
            input.progress.quiz_score > 0 ||
            input.progress.note_completed
          ? "in_progress"
          : "stalled",
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
}

async function recordStudentActivity(
  studentId: string,
  type: "login" | "lesson_completed",
  courseId?: string,
  lessonId?: string,
) {
  await StudentActivityModel.create({
    student_id: studentId,
    type,
    course_id: courseId,
    lesson_id: lessonId,
    occurred_at: new Date().toISOString(),
  });
}

async function buildStudentActivitySummary(studentId: string) {
  const today = new Date();
  const rangeStart = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 6);

  const [recentActivities, allActivities] = await Promise.all([
    StudentActivityModel.find({
      student_id: studentId,
      occurred_at: { $gte: rangeStart.toISOString() },
    })
      .sort({ occurred_at: 1 })
      .select("type occurred_at"),
    StudentActivityModel.find({ student_id: studentId })
      .sort({ occurred_at: -1 })
      .select("occurred_at"),
  ]);

  const dayKeys = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(rangeStart);
    date.setUTCDate(rangeStart.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });

  const countsByDay = new Map(
    dayKeys.map((dayKey) => [
      dayKey,
      { login_count: 0, lesson_completion_count: 0 },
    ]),
  );

  for (const activity of recentActivities) {
    const dayKey = toDateKey(activity.occurred_at);
    const currentCounts = countsByDay.get(dayKey);
    if (!currentCounts) {
      continue;
    }

    if (activity.type === "login") {
      currentCounts.login_count += 1;
      continue;
    }

    currentCounts.lesson_completion_count += 1;
  }

  const activityLast7Days = dayKeys.map((dayKey) => {
    const counts = countsByDay.get(dayKey) ?? {
      login_count: 0,
      lesson_completion_count: 0,
    };
    const totalCount = counts.login_count + counts.lesson_completion_count;

    return {
      date: dayKey,
      login_count: counts.login_count,
      lesson_completion_count: counts.lesson_completion_count,
      total_count: totalCount,
      is_active: totalCount > 0,
    };
  });

  const uniqueDays = Array.from(
    new Set(allActivities.map((activity) => toDateKey(activity.occurred_at)).filter(Boolean)),
  );

  let currentStreak = 0;
  if (uniqueDays.length > 0) {
    const cursor = new Date(`${uniqueDays[0]}T00:00:00.000Z`);

    for (const dayKey of uniqueDays) {
      if (dayKey !== toDateKey(cursor)) {
        break;
      }

      currentStreak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
  }

  return {
    activityLast7Days,
    currentStreak,
  };
}

async function resolveCertificateTemplate(courseId: string) {
  const publishedTemplate = await CertificateTemplateModel.findOne({
    linked_course_id: courseId,
    publish_status: "published",
  }).sort({ updatedAt: -1 });

  if (publishedTemplate) {
    return publishedTemplate;
  }

  const existingTemplate = await CertificateTemplateModel.findOne({
    linked_course_id: courseId,
  }).sort({ updatedAt: -1 });

  if (existingTemplate) {
    return existingTemplate;
  }

  return CertificateTemplateModel.create({
    linked_course_id: courseId,
    completion_required_percentage: 100,
    template_upload: "auto-generated-template",
    publish_status: "published",
  });
}

async function ensureCourseCertificateIssued(
  student: StudentEntity,
  course: {
    id: string;
  },
  enrollment: {
    progress_percent: number;
    completed_at: string | null;
  },
) {
  if (enrollment.progress_percent < 100) {
    return null;
  }

  const template = await resolveCertificateTemplate(course.id);

  return certificateService.generateIssued({
    template_id: String(template.id),
    linked_course_id: course.id,
    student_id: student.id,
    student_name: student.name,
    generated_by: "System Auto Generate",
    verification_status: "verified",
    issued_at: enrollment.completed_at ?? new Date().toISOString(),
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

  const [courses, lessonCounts, orderedLessonsByCourseIdEntries] = await Promise.all([
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
    Promise.all(
      courseIds.map(async (courseId) => [
        String(courseId),
        await getOrderedPublishedCourseLessons(String(courseId)),
      ] as const),
    ),
  ]);

  const courseById = new Map(courses.map((course) => [String(course.id), course]));
  const lessonsCountByCourseId = new Map(
    lessonCounts.map((item) => [String(item._id), item.total_lessons]),
  );
  const orderedLessonsByCourseId = new Map(orderedLessonsByCourseIdEntries);

  return enrollments
    .map((enrollment) => {
      const course = courseById.get(String(enrollment.course_id));
      if (!course) {
        return null;
      }

      const orderedCourseLessons = orderedLessonsByCourseId.get(String(course.id));
      const orderedLessons = orderedCourseLessons?.orderedLessons ?? [];
      const moduleById = new Map(
        (orderedCourseLessons?.modules ?? []).map((module) => [module.id, module] as const),
      );
      const totalLessons =
        lessonsCountByCourseId.get(String(enrollment.course_id)) ??
        orderedLessons.length ??
        course.total_lessons ??
        0;
      const completedSet = new Set(enrollment.completed_lessons);
      const completedLessonsCount = orderedLessons.filter((lesson) =>
        completedSet.has(lesson.id),
      ).length;
      const currentLesson =
        enrollment.access_status === "locked"
          ? null
          : orderedLessons.find((lesson) => !completedSet.has(lesson.id)) ?? null;
      const lastCompletedLesson = [...orderedLessons]
        .reverse()
        .find((lesson) => completedSet.has(lesson.id));

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
        current_lesson_id: currentLesson?.id ?? null,
        current_lesson_title: currentLesson
          ? resolveLocalizedLessonTitle(currentLesson, lang)
          : null,
        current_module_title: currentLesson
          ? resolveLocalizedModuleTitle(
              moduleById.get(String(currentLesson.module_id)) ?? {
                title_en: "",
                title_bn: "",
              },
              lang,
            )
          : null,
        last_completed_lesson_title: lastCompletedLesson
          ? resolveLocalizedLessonTitle(lastCompletedLesson, lang)
          : null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function buildRoadmapResponse(input: {
  course: {
    id: string;
    slug: string;
    title_en: string;
    title_bn: string;
    subtitle_en: string;
    subtitle_bn: string;
    thumbnail?: string;
    duration: string;
  };
  enrollment: {
    id?: string | null;
    status: "active" | "paused" | "completed";
    access_status: "active" | "locked";
    updatedAt: Date;
  } & {
    progress_percent: number;
  };
  context: CourseProgressContext;
  lang: Language;
}) {
  const lessonsByModuleId = new Map<string, LessonRuntimeState[]>();

  for (const lessonState of input.context.lessonStates) {
    const moduleId = String(lessonState.lesson.module_id);
    const currentLessons = lessonsByModuleId.get(moduleId) ?? [];
    currentLessons.push(lessonState);
    lessonsByModuleId.set(moduleId, currentLessons);
  }

  const roadmapModules = input.context.modules.map((module) => {
    const moduleLessonStates = lessonsByModuleId.get(String(module.id)) ?? [];
    const completedLessonsCount = moduleLessonStates.filter(
      (lessonState) => lessonState.progress.lesson_completed,
    ).length;
    const progressPercent = calculateProgressPercent(
      completedLessonsCount,
      moduleLessonStates.length,
    );

    let status: "completed" | "current" | "upcoming" | "locked" = "upcoming";
    if (
      moduleLessonStates.length > 0 &&
      completedLessonsCount === moduleLessonStates.length
    ) {
      status = "completed";
    } else if (moduleLessonStates.some((lessonState) => lessonState.status === "current")) {
      status = "current";
    } else if (input.enrollment.access_status === "locked") {
      status = "locked";
    }

    return {
      id: module.id,
      title: resolveLocalizedModuleTitle(module, input.lang),
      order_no: module.order_no,
      total_lessons: moduleLessonStates.length,
      completed_lessons_count: completedLessonsCount,
      progress_percent: progressPercent,
      status,
      lessons: moduleLessonStates.map((lessonState) => ({
        id: lessonState.lesson.id,
        title: resolveLocalizedLessonTitle(lessonState.lesson, input.lang),
        order_no: lessonState.lesson.order_no,
        module_id: lessonState.lesson.module_id,
        status: lessonState.status,
        is_unlocked: lessonState.lesson_unlocked,
        progress: lessonState.progress,
        contents: lessonState.contents,
      })),
    };
  });

  const currentLessonState =
    input.context.currentLessonId === null
      ? null
      : input.context.lessonStateById.get(input.context.currentLessonId) ?? null;

  return {
    course: {
      enrollment_id: String(input.enrollment.id),
      course_id: input.course.id,
      slug: input.course.slug,
      title: resolveLocalizedCourseTitle(input.course, input.lang),
      subtitle: resolveLocalizedCourseSubtitle(input.course, input.lang),
      thumbnail: input.course.thumbnail ?? "",
      duration: input.course.duration,
      total_lessons: input.context.orderedLessons.length,
      completed_lessons_count: input.context.completedLessonsCount,
      remaining_lessons: Math.max(
        0,
        input.context.orderedLessons.length - input.context.completedLessonsCount,
      ),
      progress_percent: input.enrollment.progress_percent,
      status: input.enrollment.status,
      access_status: input.enrollment.access_status,
      last_activity_at: input.enrollment.updatedAt.toISOString(),
    },
    summary: {
      total_modules: roadmapModules.length,
      completed_modules: roadmapModules.filter((module) => module.status === "completed")
        .length,
      total_lessons: input.context.orderedLessons.length,
      completed_lessons: input.context.completedLessonsCount,
      current_lesson_id: currentLessonState?.lesson.id ?? null,
      next_lesson: currentLessonState
        ? {
            id: currentLessonState.lesson.id,
            title: resolveLocalizedLessonTitle(currentLessonState.lesson, input.lang),
            order_no: currentLessonState.lesson.order_no,
            module_id: currentLessonState.lesson.module_id,
            module_title: resolveLocalizedModuleTitle(
              input.context.moduleById.get(String(currentLessonState.lesson.module_id)) ?? {
                title_en: "",
                title_bn: "",
              },
              input.lang,
            ),
          }
        : null,
    },
    modules: roadmapModules,
  };
}

async function resolveLessonActionContext(
  userId: string,
  courseId: string,
  lessonId: string,
) {
  const [student, enrollment, course] = await Promise.all([
    ensureStudent(userId),
    EnrollmentModel.findOne({
      student_id: userId,
      course_id: courseId,
    }),
    CourseModel.findOne({ _id: courseId, publish_status: "published" }),
  ]);

  if (!enrollment) {
    throw new AppError(StatusCodes.NOT_FOUND, "Enrollment not found");
  }

  if (!course) {
    throw new AppError(StatusCodes.NOT_FOUND, "Published course not found");
  }

  if (enrollment.access_status === "locked") {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Enrollment is locked. Please complete payment first",
    );
  }

  const context = await buildCourseProgressContext(userId, courseId, enrollment, "en");
  const lessonState = context.lessonStateById.get(lessonId);

  if (!context.orderedLessons.length) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "No published lessons found for this course",
    );
  }

  if (!lessonState) {
    throw new AppError(StatusCodes.NOT_FOUND, "Lesson not found in this course");
  }

  if (!lessonState.lesson_unlocked && !lessonState.progress.lesson_completed) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Complete the current unlocked lesson before opening this one",
    );
  }

  const lessonContents = await LessonContentModel.find({ lesson_id: lessonId }).sort({
    order_no: 1,
  });

  return {
    student,
    enrollment,
    course,
    context,
    lessonState,
    lessonContents,
  };
}

async function syncLessonMutation(input: {
  student: StudentEntity;
  course: {
    id: string;
    title_en: string;
  };
  enrollment: {
    student_name: string;
    course_name: string;
    completed_lessons: string[];
    progress_percent: number;
    completed_at: string | null;
    status: "active" | "paused" | "completed";
    access_status: "active" | "locked";
    save: () => Promise<unknown>;
    toJSON?: () => Record<string, unknown>;
  };
  lesson: {
    id: string;
    module_id: string;
    title_en: string;
  };
  orderedLessons: CourseProgressContext["orderedLessons"];
  progressByLessonId: Map<string, LessonProgressSnapshot>;
  previousProgress: LessonProgressSnapshot;
  nextProgress: LessonProgressSnapshot;
}) {
  await StudentLessonProgressModel.findOneAndUpdate(
    {
      student_id: input.student.id,
      course_id: input.course.id,
      lesson_id: input.lesson.id,
    },
    {
      student_id: input.student.id,
      course_id: input.course.id,
      module_id: input.lesson.module_id,
      lesson_id: input.lesson.id,
      video_watch_percent: input.nextProgress.video_watch_percent,
      video_completed: input.nextProgress.video_completed,
      quiz_completed: input.nextProgress.quiz_completed,
      quiz_score: input.nextProgress.quiz_score,
      note_completed: input.nextProgress.note_completed,
      lesson_completed: input.nextProgress.lesson_completed,
      current_step: input.nextProgress.current_step,
      completed_at: input.nextProgress.completed_at,
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  await syncLegacyProgressRecord({
    studentId: input.student.id,
    studentName: input.student.name,
    courseName: input.course.title_en,
    lessonTitle: input.lesson.title_en,
    progress: input.nextProgress,
  });

  const nextProgressByLessonId = new Map(input.progressByLessonId);
  nextProgressByLessonId.set(input.lesson.id, input.nextProgress);

  const completedLessonIds = input.orderedLessons
    .filter((lesson) => {
      const lessonProgress = nextProgressByLessonId.get(lesson.id);
      return lessonProgress?.lesson_completed ?? false;
    })
    .map((lesson) => lesson.id);

  const totalLessons = input.orderedLessons.length;

  input.enrollment.student_name = input.student.name;
  input.enrollment.course_name = input.course.title_en;
  input.enrollment.completed_lessons = completedLessonIds;
  input.enrollment.progress_percent = calculateProgressPercent(
    completedLessonIds.length,
    totalLessons,
  );
  input.enrollment.status =
    input.enrollment.progress_percent >= 100
      ? "completed"
      : input.enrollment.access_status === "locked"
        ? "paused"
        : "active";
  input.enrollment.completed_at =
    input.enrollment.progress_percent >= 100
      ? input.enrollment.completed_at ??
        input.nextProgress.completed_at ??
        new Date().toISOString()
      : null;

  await input.enrollment.save();

  if (
    !input.previousProgress.lesson_completed &&
    input.nextProgress.lesson_completed
  ) {
    await recordStudentActivity(
      input.student.id,
      "lesson_completed",
      input.course.id,
      input.lesson.id,
    );
  }

  if (input.enrollment.progress_percent >= 100) {
    await ensureCourseCertificateIssued(input.student, input.course, input.enrollment);
  }

  return {
    enrollment: input.enrollment,
    totalLessons,
    completedLessonsCount: completedLessonIds.length,
    isCourseCompleted: input.enrollment.progress_percent >= 100,
  };
}

function buildLessonMutationResponse(input: {
  progress: LessonProgressSnapshot;
  progress_percent: number;
  total_lessons: number;
  completed_lessons_count: number;
  is_course_completed: boolean;
}) {
  return {
    current_step: input.progress.current_step,
    progress: {
      video_watch_percent: input.progress.video_watch_percent,
      video_completed: input.progress.video_completed,
      quiz_completed: input.progress.quiz_completed,
      quiz_score: input.progress.quiz_score,
      note_completed: input.progress.note_completed,
      lesson_completed: input.progress.lesson_completed,
      completed_at: input.progress.completed_at,
    },
    course: {
      progress_percent: input.progress_percent,
      total_lessons: input.total_lessons,
      completed_lessons_count: input.completed_lessons_count,
      is_course_completed: input.is_course_completed,
    },
  };
}

export const studentService = {
  async getProfile(userId: string) {
    const student = await ensureStudent(userId);
    return buildStudentProfile(student);
  },

  async updateProfile(userId: string, payload: UpdateStudentProfileInput) {
    const student = await ensureStudent(userId);
    const previousName = student.name;

    if (typeof payload.name === "string") {
      student.name = payload.name.trim();
    }

    if (typeof payload.phone === "string") {
      student.phone = payload.phone.trim();
    }

    await student.save();

    if (previousName !== student.name) {
      await syncStudentNameReferences(student.id, previousName, student.name);
    }

    return buildStudentProfile(student);
  },

  async getCourses(userId: string, lang: Language) {
    await ensureStudent(userId);
    return buildStudentCourses(userId, lang);
  },

  async getCourseRoadmap(userId: string, courseId: string, lang: Language) {
    await ensureStudent(userId);

    const [enrollment, course] = await Promise.all([
      EnrollmentModel.findOne({
        student_id: userId,
        course_id: courseId,
      }),
      CourseModel.findOne({ _id: courseId, publish_status: "published" }),
    ]);

    if (!enrollment) {
      throw new AppError(StatusCodes.NOT_FOUND, "Enrollment not found");
    }

    if (!course) {
      throw new AppError(StatusCodes.NOT_FOUND, "Published course not found");
    }

    const context = await buildCourseProgressContext(userId, courseId, enrollment, lang);

    return buildRoadmapResponse({
      course: {
        id: String(course.id),
        slug: course.slug,
        title_en: course.title_en,
        title_bn: course.title_bn,
        subtitle_en: course.subtitle_en,
        subtitle_bn: course.subtitle_bn,
        thumbnail: course.thumbnail,
        duration: course.duration,
      },
      enrollment,
      context,
      lang,
    });
  },

  async getDashboard(userId: string, lang: Language) {
    const student = await ensureStudent(userId);
    const [courses, activitySummary, issuedCertificates] = await Promise.all([
      buildStudentCourses(userId, lang),
      buildStudentActivitySummary(userId),
      IssuedCertificateModel.countDocuments(buildStudentCertificateFilter(student)),
    ]);

    const totalLessonsCompleted = courses.reduce(
      (sum, item) => sum + item.completed_lessons_count,
      0,
    );
    const totalLessons = courses.reduce((sum, item) => sum + item.total_lessons, 0);
    const completionRate =
      totalLessons > 0
        ? Number(((totalLessonsCompleted / totalLessons) * 100).toFixed(2))
        : 0;
    const completedCourses = courses.filter((course) => course.status === "completed")
      .length;

    const upcomingLessons = courses
      .filter(
        (course) =>
          course.access_status === "active" &&
          course.status !== "completed" &&
          course.current_lesson_id &&
          course.current_lesson_title,
      )
      .slice(0, 5)
      .map((course) => ({
        course_id: course.course_id,
        course_title: course.title,
        lesson_id: course.current_lesson_id!,
        lesson_title: course.current_lesson_title!,
        order_no: course.completed_lessons_count + 1,
      }));

    return {
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
      },
      stats: {
        enrolled_courses: courses.length,
        completed_courses: completedCourses,
        total_lessons_completed: totalLessonsCompleted,
        total_lessons: totalLessons,
        completion_rate: completionRate,
        issued_certificates: issuedCertificates,
        current_streak: activitySummary.currentStreak,
      },
      activity_last_7_days: activitySummary.activityLast7Days,
      enrolled_courses: courses,
      upcoming_lessons: upcomingLessons,
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

  async updateLessonVideoProgress(
    userId: string,
    courseId: string,
    lessonId: string,
    payload: UpdateLessonVideoProgressInput,
  ) {
    const actionContext = await resolveLessonActionContext(userId, courseId, lessonId);
    const { lessonState, lessonContents } = actionContext;
    const hasVideo = lessonContents.some((content) => content.type === "video");
    const hasQuiz = lessonContents.some((content) => content.type === "quiz");
    const hasNote = lessonContents.some((content) => content.type === "pdf");
    const nextVideoWatchPercent = hasVideo
      ? Math.max(
          lessonState.progress.video_watch_percent,
          clampPercent(payload.watch_percent),
        )
      : 100;
    const nextVideoCompleted =
      lessonState.progress.lesson_completed ||
      !hasVideo ||
      lessonState.progress.video_completed ||
      nextVideoWatchPercent >= 100;
    const nextLessonCompleted =
      lessonState.progress.lesson_completed ||
      (nextVideoCompleted && !hasQuiz && !hasNote);
    const nextProgress: LessonProgressSnapshot = {
      ...lessonState.progress,
      video_watch_percent: nextVideoWatchPercent,
      video_completed: nextVideoCompleted,
      lesson_completed: nextLessonCompleted,
      current_step: resolveLearningStep({
        hasVideo,
        hasQuiz,
        hasNote,
        videoCompleted: nextVideoCompleted,
        quizCompleted: lessonState.progress.quiz_completed,
        noteCompleted: lessonState.progress.note_completed,
        lessonCompleted: nextLessonCompleted,
      }),
      completed_at: nextLessonCompleted
        ? lessonState.progress.completed_at ?? new Date().toISOString()
        : null,
    };

    const mutation = await syncLessonMutation({
      student: actionContext.student,
      course: {
        id: String(actionContext.course.id),
        title_en: actionContext.course.title_en,
      },
      enrollment: actionContext.enrollment,
      lesson: {
        id: lessonState.lesson.id,
        module_id: lessonState.lesson.module_id,
        title_en: lessonState.lesson.title_en,
      },
      orderedLessons: actionContext.context.orderedLessons,
      progressByLessonId: actionContext.context.progressByLessonId,
      previousProgress: lessonState.progress,
      nextProgress,
    });

    return buildLessonMutationResponse({
      progress: nextProgress,
      progress_percent: mutation.enrollment.progress_percent,
      total_lessons: mutation.totalLessons,
      completed_lessons_count: mutation.completedLessonsCount,
      is_course_completed: mutation.isCourseCompleted,
    });
  },

  async submitLessonQuiz(
    userId: string,
    courseId: string,
    lessonId: string,
    payload: SubmitLessonQuizInput,
  ) {
    const actionContext = await resolveLessonActionContext(userId, courseId, lessonId);
    const { lessonState, lessonContents } = actionContext;
    const hasVideo = lessonContents.some((content) => content.type === "video");
    const hasNote = lessonContents.some((content) => content.type === "pdf");

    if (hasVideo && !lessonState.progress.video_completed && !lessonState.progress.lesson_completed) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Finish the lesson video before attempting the quiz",
      );
    }

    const quizContent = lessonContents.find((content) => content.type === "quiz");
    const quizData =
      quizContent?.quiz_data && typeof quizContent.quiz_data === "object"
        ? (quizContent.quiz_data as Record<string, unknown>)
        : null;
    const rawQuestions = Array.isArray(quizData?.questions) ? quizData.questions : [];

    if (!quizContent) {
      throw new AppError(StatusCodes.BAD_REQUEST, "No quiz is available for this lesson");
    }

    const submittedAnswers = payload.answers ?? {};
    const correctCount = rawQuestions.reduce((count, question, index) => {
      const value =
        question && typeof question === "object"
          ? (question as Record<string, unknown>)
          : {};
      const questionId =
        typeof value.id === "string"
          ? value.id
          : `${lessonId}-question-${index + 1}`;
      const selectedAnswers = Array.isArray(submittedAnswers[questionId])
        ? submittedAnswers[questionId]
        : [];

      return count + (isSubmittedAnswerCorrect(value.correct_answer, selectedAnswers) ? 1 : 0);
    }, 0);
    const totalQuestions = rawQuestions.length;
    const percent = totalQuestions
      ? Math.round((correctCount / totalQuestions) * 100)
      : 100;
    const passMark =
      typeof quizData?.pass_mark === "number" ? quizData.pass_mark : 70;
    const passed = percent >= passMark;
    const nextQuizCompleted =
      lessonState.progress.lesson_completed ||
      lessonState.progress.quiz_completed ||
      passed;
    const nextLessonCompleted =
      lessonState.progress.lesson_completed || (nextQuizCompleted && !hasNote);
    const nextProgress: LessonProgressSnapshot = {
      ...lessonState.progress,
      video_completed: lessonState.progress.video_completed || !hasVideo,
      quiz_completed: nextQuizCompleted,
      quiz_score: Math.max(lessonState.progress.quiz_score, percent),
      lesson_completed: nextLessonCompleted,
      current_step: resolveLearningStep({
        hasVideo,
        hasQuiz: true,
        hasNote,
        videoCompleted: lessonState.progress.video_completed || !hasVideo,
        quizCompleted: nextQuizCompleted,
        noteCompleted: lessonState.progress.note_completed,
        lessonCompleted: nextLessonCompleted,
      }),
      completed_at: nextLessonCompleted
        ? lessonState.progress.completed_at ?? new Date().toISOString()
        : null,
    };

    const mutation = await syncLessonMutation({
      student: actionContext.student,
      course: {
        id: String(actionContext.course.id),
        title_en: actionContext.course.title_en,
      },
      enrollment: actionContext.enrollment,
      lesson: {
        id: lessonState.lesson.id,
        module_id: lessonState.lesson.module_id,
        title_en: lessonState.lesson.title_en,
      },
      orderedLessons: actionContext.context.orderedLessons,
      progressByLessonId: actionContext.context.progressByLessonId,
      previousProgress: lessonState.progress,
      nextProgress,
    });

    return {
      ...buildLessonMutationResponse({
        progress: nextProgress,
        progress_percent: mutation.enrollment.progress_percent,
        total_lessons: mutation.totalLessons,
        completed_lessons_count: mutation.completedLessonsCount,
        is_course_completed: mutation.isCourseCompleted,
      }),
      quiz: {
        correct_count: correctCount,
        total_questions: totalQuestions,
        percent,
        pass_mark: passMark,
        passed,
      },
    };
  },

  async completeLessonNote(userId: string, courseId: string, lessonId: string) {
    const actionContext = await resolveLessonActionContext(userId, courseId, lessonId);
    const { lessonState, lessonContents } = actionContext;
    const hasVideo = lessonContents.some((content) => content.type === "video");
    const hasQuiz = lessonContents.some((content) => content.type === "quiz");
    const hasNote = lessonContents.some((content) => content.type === "pdf");

    if (hasVideo && !lessonState.progress.video_completed && !lessonState.progress.lesson_completed) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Finish the lesson video before marking notes complete",
      );
    }

    if (hasQuiz && !lessonState.progress.quiz_completed && !lessonState.progress.lesson_completed) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Pass the lesson quiz before opening the notes",
      );
    }

    const nextProgress: LessonProgressSnapshot = {
      ...lessonState.progress,
      video_completed: lessonState.progress.video_completed || !hasVideo,
      quiz_completed: lessonState.progress.quiz_completed || !hasQuiz,
      note_completed: lessonState.progress.note_completed || !hasNote || true,
      lesson_completed: true,
      current_step: "completed",
      completed_at: lessonState.progress.completed_at ?? new Date().toISOString(),
    };

    const mutation = await syncLessonMutation({
      student: actionContext.student,
      course: {
        id: String(actionContext.course.id),
        title_en: actionContext.course.title_en,
      },
      enrollment: actionContext.enrollment,
      lesson: {
        id: lessonState.lesson.id,
        module_id: lessonState.lesson.module_id,
        title_en: lessonState.lesson.title_en,
      },
      orderedLessons: actionContext.context.orderedLessons,
      progressByLessonId: actionContext.context.progressByLessonId,
      previousProgress: lessonState.progress,
      nextProgress,
    });

    return buildLessonMutationResponse({
      progress: nextProgress,
      progress_percent: mutation.enrollment.progress_percent,
      total_lessons: mutation.totalLessons,
      completed_lessons_count: mutation.completedLessonsCount,
      is_course_completed: mutation.isCourseCompleted,
    });
  },

  async getCertificates(userId: string, lang: Language) {
    const student = await ensureStudent(userId);
    const certificates = await IssuedCertificateModel.find(
      buildStudentCertificateFilter(student),
    ).sort({ issued_at: -1 });

    const courseIds = Array.from(
      new Set(certificates.map((certificate) => String(certificate.linked_course_id))),
    );
    const courses = await CourseModel.find({ _id: { $in: courseIds } });
    const courseById = new Map(courses.map((course) => [String(course.id), course]));

    return certificates.map((certificate) => {
      const linkedCourse = courseById.get(String(certificate.linked_course_id));

      return {
        id: certificate.id,
        certificate_no: certificate.certificate_no,
        course_id: String(certificate.linked_course_id),
        course_title: linkedCourse
          ? resolveLocalizedCourseTitle(linkedCourse, lang)
          : certificate.linked_course_name,
        issued_at: certificate.issued_at,
        verification_status: certificate.verification_status,
        downloadable: true,
      };
    });
  },

  async downloadCertificate(userId: string, certificateId: string) {
    const student = await ensureStudent(userId);
    const certificate = await IssuedCertificateModel.findOne({
      _id: certificateId,
      ...buildStudentCertificateFilter(student),
    });

    if (!certificate) {
      throw new AppError(StatusCodes.NOT_FOUND, "Issued certificate not found");
    }

    return certificateService.generateIssuedPdf(String(certificate.id));
  },

  async getOrders(userId: string) {
    const student = await ensureStudent(userId);
    const orders = await PaymentModel.find(buildStudentPaymentFilter(student)).sort({
      submitted_at: -1,
    });

    return orders.map((order) => ({
      id: order.id,
      invoice: order.invoice,
      trx_id: order.trx_id,
      payment_id: order.paymentID ?? null,
      course_id: order.course_id ?? null,
      course_name: order.course_name,
      amount: order.amount,
      gateway: order.gateway,
      status: order.status,
      submitted_at: order.submitted_at,
      manually_verified_by: order.manually_verified_by,
    }));
  },

  async completeNextLesson(userId: string, courseId: string) {
    const [student, enrollment, course] = await Promise.all([
      ensureStudent(userId),
      EnrollmentModel.findOne({
        student_id: userId,
        course_id: courseId,
      }),
      CourseModel.findOne({ _id: courseId, publish_status: "published" }),
    ]);

    if (!enrollment) {
      throw new AppError(StatusCodes.NOT_FOUND, "Enrollment not found");
    }

    if (!course) {
      throw new AppError(StatusCodes.NOT_FOUND, "Published course not found");
    }

    if (enrollment.access_status === "locked") {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Enrollment is locked. Please complete payment first",
      );
    }

    const context = await buildCourseProgressContext(userId, courseId, enrollment, "en");

    if (!context.orderedLessons.length) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "No published lessons found for this course",
      );
    }

    const currentLessonState =
      context.currentLessonId === null
        ? null
        : context.lessonStateById.get(context.currentLessonId) ?? null;

    if (!currentLessonState) {
      return {
        completed_lesson_id: null,
        completed_lesson_title: null,
        progress_percent: enrollment.progress_percent,
        is_course_completed: enrollment.progress_percent >= 100,
        enrollment: enrollment.toJSON(),
      };
    }

    const completionTimestamp = currentLessonState.progress.completed_at ?? new Date().toISOString();
    const nextProgress: LessonProgressSnapshot = {
      ...currentLessonState.progress,
      video_watch_percent: 100,
      video_completed: true,
      quiz_completed: true,
      quiz_score: Math.max(currentLessonState.progress.quiz_score, 100),
      note_completed: true,
      lesson_completed: true,
      current_step: "completed",
      completed_at: completionTimestamp,
    };

    const mutation = await syncLessonMutation({
      student,
      course: {
        id: String(course.id),
        title_en: course.title_en,
      },
      enrollment,
      lesson: {
        id: currentLessonState.lesson.id,
        module_id: currentLessonState.lesson.module_id,
        title_en: currentLessonState.lesson.title_en,
      },
      orderedLessons: context.orderedLessons,
      progressByLessonId: context.progressByLessonId,
      previousProgress: currentLessonState.progress,
      nextProgress,
    });

    return {
      completed_lesson_id: currentLessonState.lesson.id,
      completed_lesson_title: currentLessonState.lesson.title_en,
      progress_percent: mutation.enrollment.progress_percent,
      is_course_completed: mutation.isCourseCompleted,
      enrollment:
        typeof mutation.enrollment.toJSON === "function"
          ? mutation.enrollment.toJSON()
          : mutation.enrollment,
    };
  },
};
