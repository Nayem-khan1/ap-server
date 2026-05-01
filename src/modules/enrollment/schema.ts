import { z } from "zod";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const couponCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_-]+$/);

const newStudentSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().min(6).optional(),
  password: z.string().min(6),
});

const manualEnrollmentPreviewSchema = z.object({
  course_id: objectIdSchema,
  coupon_code: couponCodeSchema.optional(),
  manual_discount_amount: z.coerce.number().min(0).default(0),
});

export const manualEnrollmentSchema = z
  .object({
    student_id: objectIdSchema.optional(),
    student: newStudentSchema.optional(),
    course_id: objectIdSchema,
    coupon_code: couponCodeSchema.optional(),
    manual_discount_amount: z.coerce.number().min(0).default(0),
    batch_id: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const hasStudentId = Boolean(values.student_id?.trim());
    const hasNewStudent = Boolean(values.student);

    if (!hasStudentId && !hasNewStudent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["student_id"],
        message: "Provide an existing student or create a new student",
      });
    }

    if (hasStudentId && hasNewStudent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["student"],
        message: "Choose either an existing student or a new student payload",
      });
    }
  });

export const statusUpdateSchema = z.object({
  status: z.enum(["active", "paused", "completed"]),
});

export const enrollmentIdParamSchema = z.object({
  id: objectIdSchema,
});

export const bulkDeleteSchema = z.object({
  ids: z.array(objectIdSchema).min(1),
});

export const enrollmentValidation = {
  manualPreview: { body: manualEnrollmentPreviewSchema },
  manualEnroll: { body: manualEnrollmentSchema },
  statusUpdate: { params: enrollmentIdParamSchema, body: statusUpdateSchema },
  enrollmentId: { params: enrollmentIdParamSchema },
  bulkDelete: { body: bulkDeleteSchema },
};
