import { z } from "zod";

const courseIdParamSchema = z.object({
  courseId: z.string().min(1),
});

const lessonActionParamSchema = courseIdParamSchema.extend({
  lessonId: z.string().min(1),
});

const certificateIdParamSchema = z.object({
  certificateId: z.string().min(1),
});

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    phone: z.string().trim().min(6).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required",
  });

const localeQuerySchema = z.object({
  lang: z.enum(["en", "bn"]).default("en"),
});

const videoProgressSchema = z.object({
  watch_percent: z.number().min(0).max(100),
});

const submitQuizSchema = z.object({
  answers: z.record(z.string(), z.array(z.string())),
});

const couponCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_-]+$/);

const courseEnrollmentBodySchema = z.object({
  coupon_code: couponCodeSchema.optional(),
});

export const studentValidation = {
  courseIdParam: { params: courseIdParamSchema },
  certificateIdParam: { params: certificateIdParamSchema },
  courseRoadmap: {
    params: courseIdParamSchema,
    query: localeQuerySchema,
  },
  lessonVideoProgress: {
    params: lessonActionParamSchema,
    body: videoProgressSchema,
  },
  lessonQuizSubmission: {
    params: lessonActionParamSchema,
    body: submitQuizSchema,
  },
  lessonNoteCompletion: {
    params: lessonActionParamSchema,
  },
  courseEnrollment: {
    params: courseIdParamSchema,
    body: courseEnrollmentBodySchema,
  },
  updateProfile: { body: updateProfileSchema },
  localeQuery: { query: localeQuerySchema },
};

export type UpdateStudentProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateLessonVideoProgressInput = z.infer<typeof videoProgressSchema>;
export type SubmitLessonQuizInput = z.infer<typeof submitQuizSchema>;
