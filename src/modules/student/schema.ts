import { z } from "zod";

const courseIdParamSchema = z.object({
  courseId: z.string().min(1),
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

export const studentValidation = {
  courseIdParam: { params: courseIdParamSchema },
  courseRoadmap: {
    params: courseIdParamSchema,
    query: localeQuerySchema,
  },
  updateProfile: { body: updateProfileSchema },
  localeQuery: { query: localeQuerySchema },
};

export type UpdateStudentProfileInput = z.infer<typeof updateProfileSchema>;

