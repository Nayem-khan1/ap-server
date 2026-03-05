import bcrypt from "../../utils/bcrypt";
import { StatusCodes } from "http-status-codes";
import { env } from "../../config/env";
import { AppError } from "../../errors/app-error";
import { UserModel } from "./model";
import {
  CreateAdminInput,
  CreateInstructorInput,
  CreateStudentInput,
  UpdateAdminInput,
  UpdateInstructorInput,
} from "./schema";
import { EnrollmentModel, ProgressModel } from "../enrollment/model";
import { PaymentModel } from "../payment/model";

const ADMIN_ROLES = ["super_admin", "admin", "instructor"] as const;

function makeUsernameFromEmail(email: string): string {
  return email.split("@")[0].toLowerCase();
}

export const userService = {
  async listUsers(query: Record<string, unknown>) {
    const view = typeof query.view === "string" ? query.view : "students";
    if (view === "admins") {
      return this.listAdmins(query);
    }
    return this.listStudents(query);
  },

  async listStudents(query: Record<string, unknown>) {
    const filter: Record<string, unknown> = { role: "student" };
    if (typeof query.search === "string" && query.search.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }
    if (typeof query.status === "string") {
      filter.status = query.status;
    }

    const items = await UserModel.find(filter)
      .select("name email phone enrolled_courses_count status createdAt updatedAt")
      .sort({ createdAt: -1 });

    return items.map((item) => item.toJSON());
  },

  async getStudentById(id: string) {
    const student = await UserModel.findOne({ _id: id, role: "student" }).select(
      "name email phone enrolled_courses_count status createdAt updatedAt",
    );
    if (!student) throw new AppError(StatusCodes.NOT_FOUND, "Student not found");
    return student.toJSON();
  },

  async getStudentEnrollments(studentId: string) {
    const items = await EnrollmentModel.find({ student_id: studentId }).sort({
      enrolled_at: -1,
    });
    return items.map((item) => item.toJSON());
  },

  async getStudentPayments(studentId: string) {
    const student = await UserModel.findOne({ _id: studentId, role: "student" });
    if (!student) return [];
    const items = await PaymentModel.find({ student_name: student.name }).sort({
      submitted_at: -1,
    });
    return items.map((item) => item.toJSON());
  },

  async getStudentProgress(studentId: string) {
    const items = await ProgressModel.find({ student_id: studentId });
    return items.map((item) => item.toJSON());
  },

  async listAdmins(query: Record<string, unknown>) {
    const filter: Record<string, unknown> = {
      role: { $in: ADMIN_ROLES },
    };
    if (typeof query.search === "string" && query.search.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (typeof query.status === "string") {
      filter.status = query.status;
    }

    const items = await UserModel.find(filter)
      .select("name email role status createdAt updatedAt")
      .sort({ createdAt: -1 });

    return items.map((item) => item.toJSON());
  },

  async createAdmin(payload: CreateAdminInput) {
    const user = await UserModel.create({
      name: payload.name,
      email: payload.email.toLowerCase(),
      username: makeUsernameFromEmail(payload.email),
      password: payload.password,
      role: payload.role,
      status: payload.status,
    });

    return user.toJSON();
  },

  async updateAdmin(id: string, payload: UpdateAdminInput) {
    const updateData: Record<string, unknown> = {
      name: payload.name,
      email: payload.email?.toLowerCase(),
      role: payload.role,
      status: payload.status,
    };

    if (typeof payload.password === "string" && payload.password.trim()) {
      updateData.password = await bcrypt.hash(payload.password, env.BCRYPT_SALT_ROUNDS);
    }

    const user = await UserModel.findOneAndUpdate(
      { _id: id, role: { $in: ADMIN_ROLES } },
      updateData,
      { new: true, runValidators: true },
    ).select("name email role status createdAt updatedAt");

    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "Admin not found");

    return user.toJSON();
  },

  async bulkDeleteAdmins(ids: string[]) {
    await UserModel.deleteMany({ _id: { $in: ids }, role: { $in: ADMIN_ROLES } });
    return true;
  },

  async listInstructors() {
    const items = await UserModel.find({ role: "instructor" })
      .select(
        "name email bio avatar specialization publish_status createdAt updatedAt",
      )
      .sort({ updatedAt: -1 });
    return items.map((item) => item.toJSON());
  },

  async createInstructor(payload: CreateInstructorInput) {
    const user = await UserModel.create({
      name: payload.name,
      email: payload.email.toLowerCase(),
      username:
        payload.username?.toLowerCase() ?? makeUsernameFromEmail(payload.email),
      password: payload.password ?? "instructor123",
      role: "instructor",
      status: "active",
      bio: payload.bio,
      avatar: payload.avatar,
      specialization: payload.specialization,
      publish_status: payload.publish_status,
    });
    return user.toJSON();
  },

  async updateInstructor(id: string, payload: UpdateInstructorInput) {
    const updateData: Record<string, unknown> = { ...payload };
    if (typeof payload.email === "string") {
      updateData.email = payload.email.toLowerCase();
    }
    if (typeof payload.username === "string") {
      updateData.username = payload.username.toLowerCase();
    }
    if (typeof payload.password === "string" && payload.password.trim()) {
      updateData.password = await bcrypt.hash(payload.password, env.BCRYPT_SALT_ROUNDS);
    }
    const user = await UserModel.findOneAndUpdate(
      { _id: id, role: "instructor" },
      updateData,
      { new: true, runValidators: true },
    );

    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "Instructor not found");

    return user.toJSON();
  },

  async deleteInstructor(id: string) {
    await UserModel.deleteOne({ _id: id, role: "instructor" });
    return true;
  },

  async createStudent(payload: CreateStudentInput) {
    const user = await UserModel.create({
      name: payload.name,
      email: payload.email.toLowerCase(),
      username: payload.username.toLowerCase(),
      password: payload.password,
      role: "student",
      status: payload.status,
      phone: payload.phone,
      enrolled_courses_count: 0,
      publish_status: "published",
    });
    return user.toJSON();
  },
};
