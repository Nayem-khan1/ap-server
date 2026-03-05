import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/app-error";
import { CourseModel } from "../course/model";
import { UserModel } from "../user/model";
import { EnrollmentModel, ProgressModel } from "./model";

export const enrollmentService = {
  async listEnrollments(query: Record<string, unknown>) {
    const filter: Record<string, unknown> = {};

    if (typeof query.search === "string" && query.search.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { student_name: { $regex: search, $options: "i" } },
        { course_name: { $regex: search, $options: "i" } },
      ];
    }

    const items = await EnrollmentModel.find(filter).sort({ enrolled_at: -1 });
    return items.map((item) => item.toJSON());
  },

  async listProgress() {
    const items = await ProgressModel.find().sort({ updatedAt: -1 });
    return items.map((item) => item.toJSON());
  },

  async manualEnroll(payload: {
    student_name: string;
    student_id: string;
    course_id: string;
    batch_id?: string;
  }) {
    const [course, student] = await Promise.all([
      CourseModel.findById(payload.course_id),
      UserModel.findById(payload.student_id),
    ]);

    if (!course) throw new AppError(StatusCodes.NOT_FOUND, "Course not found");
    if (!student || student.role !== "student") {
      throw new AppError(StatusCodes.NOT_FOUND, "Student not found");
    }

    const payment_status = course.is_free ? "free" : "pending";
    const status = course.is_free ? "active" : "paused";
    const access_status = course.is_free ? "active" : "locked";

    const enrollment = await EnrollmentModel.findOneAndUpdate(
      {
        student_id: payload.student_id,
        course_id: payload.course_id,
      },
      {
        student_id: payload.student_id,
        student_name: payload.student_name,
        course_id: payload.course_id,
        course_name: course.title_en,
        enrolled_at: new Date().toISOString(),
        enrollment_type: "manual",
        payment_status,
        progress_percent: 0,
        completed_lessons: [],
        completed_at: null,
        status,
        access_status,
        batch_id: payload.batch_id,
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );

    await ProgressModel.findOneAndUpdate(
      {
        student_id: payload.student_id,
        course: course.title_en,
      },
      {
        student_id: payload.student_id,
        student_name: payload.student_name,
        course: course.title_en,
        lesson: "Getting Started",
        current_step: "VIDEO",
        video_watch_percent: 0,
        quiz_score: 0,
        smart_note_generated: false,
        completion_status: "in_progress",
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    const count = await EnrollmentModel.countDocuments({ student_id: payload.student_id });
    await UserModel.findByIdAndUpdate(payload.student_id, {
      enrolled_courses_count: count,
    });

    return enrollment.toJSON();
  },

  async unlockLesson(enrollmentId: string) {
    const enrollment = await EnrollmentModel.findByIdAndUpdate(
      enrollmentId,
      { access_status: "active", status: "active" },
      { new: true },
    );
    if (!enrollment) throw new AppError(StatusCodes.NOT_FOUND, "Enrollment not found");
    return enrollment.toJSON();
  },

  async resetProgress(enrollmentId: string) {
    const enrollment = await EnrollmentModel.findById(enrollmentId);
    if (!enrollment) throw new AppError(StatusCodes.NOT_FOUND, "Enrollment not found");

    await ProgressModel.updateMany(
      { student_id: enrollment.student_id, course: enrollment.course_name },
      {
        current_step: "VIDEO",
        video_watch_percent: 0,
        quiz_score: 0,
        smart_note_generated: false,
        completion_status: "in_progress",
      },
    );

    enrollment.progress_percent = 0;
    enrollment.completed_lessons = [];
    enrollment.completed_at = null;
    await enrollment.save();

    return true;
  },

  async setStatus(id: string, status: "active" | "paused" | "completed") {
    const enrollment = await EnrollmentModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );
    if (!enrollment) throw new AppError(StatusCodes.NOT_FOUND, "Enrollment not found");
    return enrollment.toJSON();
  },

  async bulkDelete(ids: string[]) {
    const items = await EnrollmentModel.find({ _id: { $in: ids } });
    const studentIds = Array.from(new Set(items.map((item) => item.student_id)));
    await EnrollmentModel.deleteMany({ _id: { $in: ids } });
    for (const studentId of studentIds) {
      const count = await EnrollmentModel.countDocuments({ student_id: studentId });
      await UserModel.findByIdAndUpdate(studentId, { enrolled_courses_count: count });
    }
    return true;
  },
};
