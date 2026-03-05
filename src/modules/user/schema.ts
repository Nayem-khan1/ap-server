import { z } from "zod";

export const adminRoleSchema = z.enum(["super_admin", "admin", "instructor"]);
export const userStatusSchema = z.enum(["active", "inactive"]);
export const publishStatusSchema = z.enum(["draft", "published", "archived"]);

export const createAdminSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin"]).default("admin"),
  status: userStatusSchema,
});

export const updateAdminSchema = createAdminSchema.extend({
  password: z.string().min(6).or(z.literal("")).optional(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  status: userStatusSchema.optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().min(1),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const createStudentSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  username: z.string().min(2),
  password: z.string().min(6),
  phone: z.string().min(6).default(""),
  status: userStatusSchema.default("active"),
});

export const createInstructorSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  username: z.string().min(2).optional(),
  password: z.string().min(6).optional(),
  bio: z.string().default(""),
  avatar: z.string().default(""),
  specialization: z.string().default(""),
  publish_status: z.enum(["draft", "published"]).default("draft"),
});

export const updateInstructorSchema = createInstructorSchema.partial();

export const userValidation = {
  createAdmin: { body: createAdminSchema },
  updateAdmin: { body: updateAdminSchema, params: userIdParamSchema },
  listUsers: { query: listUsersQuerySchema },
  userId: { params: userIdParamSchema },
  bulkDelete: { body: bulkDeleteSchema },
  createStudent: { body: createStudentSchema },
  createInstructor: { body: createInstructorSchema },
  updateInstructor: { body: updateInstructorSchema, params: userIdParamSchema },
};

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type CreateInstructorInput = z.infer<typeof createInstructorSchema>;
export type UpdateInstructorInput = z.infer<typeof updateInstructorSchema>;

