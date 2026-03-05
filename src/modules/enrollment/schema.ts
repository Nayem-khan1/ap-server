import { z } from "zod";

export const manualEnrollmentSchema = z.object({
  student_name: z.string().min(2),
  student_id: z.string().min(2),
  course_id: z.string().min(1),
  batch_id: z.string().optional(),
});

export const statusUpdateSchema = z.object({
  status: z.enum(["active", "paused", "completed"]),
});

export const enrollmentIdParamSchema = z.object({
  id: z.string().min(1),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const enrollmentValidation = {
  manualEnroll: { body: manualEnrollmentSchema },
  statusUpdate: { params: enrollmentIdParamSchema, body: statusUpdateSchema },
  enrollmentId: { params: enrollmentIdParamSchema },
  bulkDelete: { body: bulkDeleteSchema },
};

