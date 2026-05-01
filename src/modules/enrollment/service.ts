import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/app-error";
import { PaymentModel } from "../payment/model";
import { UserModel } from "../user/model";
import { createStudentAccount } from "../user/student-account";
import {
  completeEnrollmentWithoutGateway,
  resolveEnrollmentPricing,
  syncEnrolledCourseCount,
} from "./workflow";
import { EnrollmentModel, ProgressModel } from "./model";

type ManualEnrollmentStudentInput = {
  name: string;
  email: string;
  phone?: string;
  password: string;
};

type DuplicateKeyError = {
  code?: number;
};

function isDuplicateKeyError(error: unknown): error is DuplicateKeyError {
  return Boolean(error) && typeof error === "object" && (error as DuplicateKeyError).code === 11000;
}

function hasResolvedManualAccess(enrollment: {
  payment_status: string;
  access_status: string;
  status: string;
}) {
  return (
    enrollment.payment_status === "paid" ||
    enrollment.payment_status === "free" ||
    enrollment.access_status === "active" ||
    enrollment.status === "active" ||
    enrollment.status === "completed"
  );
}

async function resolveExistingStudent(studentId: string) {
  const student = await UserModel.findById(studentId);
  if (!student || student.role !== "student") {
    throw new AppError(StatusCodes.NOT_FOUND, "Student not found");
  }

  return student;
}

async function resolveManualEnrollmentStudent(input: {
  student_id?: string;
  student?: ManualEnrollmentStudentInput;
}) {
  if (input.student_id) {
    return resolveExistingStudent(input.student_id);
  }

  if (!input.student) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Student information is required");
  }

  return createStudentAccount({
    name: input.student.name,
    email: input.student.email,
    phone: input.student.phone,
    password: input.student.password,
    status: "active",
  });
}

async function resolveVerifierName(userId?: string) {
  if (!userId) {
    return "Admin";
  }

  const admin = await UserModel.findById(userId).select("name");
  return admin?.name ?? "Admin";
}

async function findVerifiedPaymentForEnrollment(enrollmentId: string) {
  return PaymentModel.findOne({
    enrollment_id: enrollmentId,
    status: "verified",
  }).sort({ createdAt: -1 });
}

export const enrollmentService = {
  async listEnrollments(query: Record<string, unknown>) {
    const filter: Record<string, unknown> = {};

    if (typeof query.search === "string" && query.search.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { student_name: { $regex: search, $options: "i" } },
        { course_name: { $regex: search, $options: "i" } },
        { coupon_code: { $regex: search, $options: "i" } },
      ];
    }

    const items = await EnrollmentModel.find(filter).sort({ enrolled_at: -1 });
    return items.map((item) => item.toJSON());
  },

  async listProgress() {
    const items = await ProgressModel.find().sort({ updatedAt: -1 });
    return items.map((item) => item.toJSON());
  },

  async previewManualEnrollment(payload: {
    course_id: string;
    coupon_code?: string;
    manual_discount_amount?: number;
  }) {
    const pricingResolution = await resolveEnrollmentPricing({
      course_id: payload.course_id,
      coupon_code: payload.coupon_code,
      manual_discount_amount: payload.manual_discount_amount,
      require_published_course: false,
    });

    return {
      course: {
        id: pricingResolution.course.id,
        title_en: pricingResolution.course.title_en,
        title_bn: pricingResolution.course.title_bn,
        is_free: pricingResolution.course.is_free,
        price: pricingResolution.course.price,
        discount_price: pricingResolution.course.discount_price,
      },
      pricing: pricingResolution.pricing,
    };
  },

  async manualEnroll(payload: {
    student_id?: string;
    student?: ManualEnrollmentStudentInput;
    course_id: string;
    coupon_code?: string;
    manual_discount_amount?: number;
    batch_id?: string;
    verified_by_user_id?: string;
  }) {
    const [pricingResolution, verifierName] = await Promise.all([
      resolveEnrollmentPricing({
        course_id: payload.course_id,
        coupon_code: payload.coupon_code,
        manual_discount_amount: payload.manual_discount_amount,
        require_published_course: false,
      }),
      resolveVerifierName(payload.verified_by_user_id),
    ]);

    const student = await resolveManualEnrollmentStudent({
      student_id: payload.student_id,
      student: payload.student,
    });

    const existingEnrollment = await EnrollmentModel.findOne({
      student_id: student.id,
      course_id: pricingResolution.course.id,
    });

    if (existingEnrollment && hasResolvedManualAccess(existingEnrollment)) {
      throw new AppError(
        StatusCodes.CONFLICT,
        "Student already has access to this course",
      );
    }

    try {
      const { enrollment, payment } = await completeEnrollmentWithoutGateway({
        student: {
          id: student.id,
          name: student.name,
        },
        course: {
          id: pricingResolution.course.id,
          title_en: pricingResolution.course.title_en,
        },
        enrollment_type: "manual",
        pricing: pricingResolution.pricing,
        batch_id: payload.batch_id,
        source: "admin_manual_enrollment",
        manually_verified_by: verifierName,
      });

      return {
        enrollment: enrollment.toJSON(),
        payment: payment.toJSON(),
        pricing: pricingResolution.pricing,
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          phone: student.phone,
          status: student.status,
        },
      };
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      const currentEnrollment =
        existingEnrollment ??
        (await EnrollmentModel.findOne({
          student_id: student.id,
          course_id: pricingResolution.course.id,
        }));

      const currentPayment = currentEnrollment
        ? await findVerifiedPaymentForEnrollment(currentEnrollment.id)
        : null;

      if (currentEnrollment && currentPayment && hasResolvedManualAccess(currentEnrollment)) {
        throw new AppError(
          StatusCodes.CONFLICT,
          "Student already has access to this course",
        );
      }

      throw error;
    }
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
      {
        status,
        access_status: status === "active" || status === "completed" ? "active" : "locked",
      },
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
      await syncEnrolledCourseCount(studentId);
    }
    return true;
  },
};
