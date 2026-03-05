import { z } from "zod";

export const certificateEligibilityFormSchema = z.object({
  minimum_completion_percent: z.coerce.number().int().min(0).max(100),
  quiz_pass_required: z.boolean(),
});

export const certificateTemplateFormSchema = z.object({
  linked_course_id: z.string().min(1),
  completion_required_percentage: z.coerce.number().int().min(0).max(100),
  template_upload: z.string().url(),
  publish_status: z.enum(["draft", "published", "archived"]),
});

export const generateCertificateFormSchema = z.object({
  template_id: z.string().min(1),
  linked_course_id: z.string().min(1),
  student_name: z.string().min(2),
  generated_by: z.string().min(2),
});

export const certificateVerificationFormSchema = z.object({
  certificate_no: z.string().min(4),
});

export const certificateIdParamSchema = z.object({
  id: z.string().min(1),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const verificationStatusUpdateSchema = z.object({
  verification_status: z.enum(["verified", "unverified"]),
});

export const templateStatusUpdateSchema = z.object({
  publish_status: z.enum(["draft", "published", "archived"]),
});

export const certificateValidation = {
  eligibilityUpdate: {
    params: certificateIdParamSchema,
    body: certificateEligibilityFormSchema,
  },
  templateCreate: { body: certificateTemplateFormSchema },
  templateUpdate: { params: certificateIdParamSchema, body: certificateTemplateFormSchema },
  templateStatus: { params: certificateIdParamSchema, body: templateStatusUpdateSchema },
  templateBulkDelete: { body: bulkDeleteSchema },
  issuedGenerate: { body: generateCertificateFormSchema },
  issuedStatusUpdate: {
    params: certificateIdParamSchema,
    body: verificationStatusUpdateSchema,
  },
  issuedPdf: {
    params: certificateIdParamSchema,
  },
  verifyByCode: { body: certificateVerificationFormSchema },
};
