import { StatusCodes } from "http-status-codes";
import { HydratedDocument } from "mongoose";
import { AppError } from "../../errors/app-error";
import { CourseModel, ICourse } from "../course/model";
import { CouponModel, ICoupon } from "../coupon/model";
import {
  IPayment,
  PaymentGateway,
  PaymentModel,
  PaymentSource,
  PaymentStatus,
} from "../payment/model";
import { UserModel } from "../user/model";
import { EnrollmentModel, IEnrollment, ProgressModel } from "./model";

type CourseDocument = HydratedDocument<ICourse>;
type CouponDocument = HydratedDocument<ICoupon>;
type EnrollmentDocument = HydratedDocument<IEnrollment>;
type PaymentDocument = HydratedDocument<IPayment>;

export interface EnrollmentPricing {
  currency: "BDT";
  original_amount: number;
  course_discount_amount: number;
  subtotal_amount: number;
  coupon_id?: string;
  coupon_code?: string;
  coupon_discount_amount: number;
  manual_discount_amount: number;
  final_amount: number;
  applied_coupon: {
    id: string;
    code: string;
    discount_type: "percentage" | "flat";
    discount_value: number;
    minimum_purchase_amount: number;
  } | null;
}

export interface EnrollmentPricingResolution {
  course: CourseDocument;
  coupon: CouponDocument | null;
  pricing: EnrollmentPricing;
}

export interface EnrollmentStudentSnapshot {
  id: string;
  name: string;
}

export interface EnrollmentCourseSnapshot {
  id: string;
  title_en: string;
}

export interface EnrollmentRecordReference {
  id: string;
}

function roundAmount(value: number): number {
  return Math.max(0, Math.round(value));
}

export function normalizeCouponCode(value?: string | null): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return normalized || undefined;
}

function resolveCourseSubtotal(course: Pick<ICourse, "is_free" | "price" | "discount_price">) {
  const originalAmount = course.is_free ? 0 : roundAmount(course.price);
  const discountedAmount =
    course.is_free || originalAmount <= 0
      ? 0
      : course.discount_price > 0 && course.discount_price < originalAmount
        ? roundAmount(course.discount_price)
        : originalAmount;

  return {
    originalAmount,
    courseDiscountAmount: Math.max(0, originalAmount - discountedAmount),
    subtotalAmount: discountedAmount,
  };
}

function resolveCouponExpiryDate(raw: string): Date | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T23:59:59.999Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveCouponDiscountAmount(
  subtotalAmount: number,
  coupon: Pick<ICoupon, "discount_type" | "discount_value">,
): number {
  if (subtotalAmount <= 0) {
    return 0;
  }

  const rawDiscount =
    coupon.discount_type === "percentage"
      ? roundAmount((subtotalAmount * coupon.discount_value) / 100)
      : roundAmount(coupon.discount_value);

  return Math.min(subtotalAmount, rawDiscount);
}

function assertCouponApplicable(input: {
  coupon: CouponDocument;
  course: CourseDocument;
  subtotalAmount: number;
}) {
  const { coupon, course, subtotalAmount } = input;

  if (!coupon.is_active) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Coupon is inactive");
  }

  const expiresAt = resolveCouponExpiryDate(coupon.expires_at);
  if (!expiresAt || expiresAt.getTime() < Date.now()) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Coupon has expired");
  }

  if (coupon.used_count >= coupon.max_redemption) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Coupon usage limit reached");
  }

  if (
    Array.isArray(coupon.course_ids) &&
    coupon.course_ids.length > 0 &&
    !coupon.course_ids.includes(String(course.id))
  ) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Coupon is not valid for this course",
    );
  }

  if (subtotalAmount < coupon.minimum_purchase_amount) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `Coupon requires a minimum purchase of ${coupon.minimum_purchase_amount} BDT`,
    );
  }
}

export async function resolveEnrollmentPricing(input: {
  course_id: string;
  coupon_code?: string;
  manual_discount_amount?: number;
  require_published_course?: boolean;
}): Promise<EnrollmentPricingResolution> {
  const courseFilter: Record<string, unknown> = {
    _id: input.course_id,
  };

  if (input.require_published_course) {
    courseFilter.publish_status = "published";
  }

  const course = await CourseModel.findOne(courseFilter);
  if (!course) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      input.require_published_course ? "Published course not found" : "Course not found",
    );
  }

  const {
    originalAmount,
    courseDiscountAmount,
    subtotalAmount,
  } = resolveCourseSubtotal(course);

  const normalizedCouponCode = normalizeCouponCode(input.coupon_code);
  if (course.is_free && normalizedCouponCode) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Coupons cannot be applied to a free course",
    );
  }

  const coupon = normalizedCouponCode
    ? await CouponModel.findOne({ code: normalizedCouponCode })
    : null;

  if (normalizedCouponCode && !coupon) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Coupon not found");
  }

  if (coupon) {
    assertCouponApplicable({
      coupon,
      course,
      subtotalAmount,
    });
  }

  const couponDiscountAmount = coupon
    ? resolveCouponDiscountAmount(subtotalAmount, coupon)
    : 0;

  const remainingAfterCoupon = Math.max(0, subtotalAmount - couponDiscountAmount);
  const requestedManualDiscount = roundAmount(input.manual_discount_amount ?? 0);
  const manualDiscountAmount = Math.min(
    remainingAfterCoupon,
    requestedManualDiscount,
  );

  return {
    course,
    coupon,
    pricing: {
      currency: "BDT",
      original_amount: originalAmount,
      course_discount_amount: courseDiscountAmount,
      subtotal_amount: subtotalAmount,
      coupon_id: coupon?.id,
      coupon_code: coupon?.code,
      coupon_discount_amount: couponDiscountAmount,
      manual_discount_amount: manualDiscountAmount,
      final_amount: Math.max(
        0,
        subtotalAmount - couponDiscountAmount - manualDiscountAmount,
      ),
      applied_coupon: coupon
        ? {
            id: coupon.id,
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            minimum_purchase_amount: coupon.minimum_purchase_amount,
          }
        : null,
    },
  };
}

export async function syncEnrolledCourseCount(studentId: string): Promise<void> {
  const enrolledCoursesCount = await EnrollmentModel.countDocuments({
    student_id: studentId,
  });

  await UserModel.findByIdAndUpdate(studentId, {
    enrolled_courses_count: enrolledCoursesCount,
  });
}

function resolvePaymentState(input: {
  paymentStatus: IEnrollment["payment_status"];
  finalAmount: number;
}) {
  const isUnlocked =
    input.paymentStatus === "paid" || input.paymentStatus === "free";

  return {
    payment_status:
      input.paymentStatus === "paid" && input.finalAmount <= 0
        ? "free"
        : input.paymentStatus,
    status: isUnlocked ? "active" : "paused",
    access_status: isUnlocked ? "active" : "locked",
  } satisfies Pick<IEnrollment, "payment_status" | "status" | "access_status">;
}

export async function upsertEnrollmentRecord(input: {
  student: EnrollmentStudentSnapshot;
  course: EnrollmentCourseSnapshot;
  enrollment_type: IEnrollment["enrollment_type"];
  payment_status: IEnrollment["payment_status"];
  pricing: EnrollmentPricing;
  batch_id?: string;
}): Promise<EnrollmentDocument> {
  const existingEnrollment = await EnrollmentModel.findOne({
    student_id: input.student.id,
    course_id: input.course.id,
  });

  const nextState = resolvePaymentState({
    paymentStatus: input.payment_status,
    finalAmount: input.pricing.final_amount,
  });

  const enrollment = await EnrollmentModel.findOneAndUpdate(
    {
      student_id: input.student.id,
      course_id: input.course.id,
    },
    {
      student_id: input.student.id,
      student_name: input.student.name,
      course_id: input.course.id,
      course_name: input.course.title_en,
      enrolled_at: existingEnrollment?.enrolled_at ?? new Date().toISOString(),
      enrollment_type: input.enrollment_type,
      payment_status: nextState.payment_status,
      original_amount: input.pricing.original_amount,
      course_discount_amount: input.pricing.course_discount_amount,
      coupon_id: input.pricing.coupon_id,
      coupon_code: input.pricing.coupon_code,
      coupon_discount_amount: input.pricing.coupon_discount_amount,
      manual_discount_amount: input.pricing.manual_discount_amount,
      final_amount: input.pricing.final_amount,
      progress_percent: existingEnrollment?.progress_percent ?? 0,
      completed_lessons: existingEnrollment?.completed_lessons ?? [],
      completed_at: existingEnrollment?.completed_at ?? null,
      status: nextState.status,
      access_status: nextState.access_status,
      batch_id: input.batch_id ?? existingEnrollment?.batch_id,
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  if (!enrollment) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Failed to create enrollment record",
    );
  }

  return enrollment;
}

export async function ensureEnrollmentProgressSeed(input: {
  student: EnrollmentStudentSnapshot;
  course: Pick<ICourse, "title_en">;
}) {
  await ProgressModel.findOneAndUpdate(
    {
      student_id: input.student.id,
      course: input.course.title_en,
    },
    {
      student_id: input.student.id,
      student_name: input.student.name,
      course: input.course.title_en,
      lesson: "Getting Started",
      current_step: "VIDEO",
      video_watch_percent: 0,
      quiz_score: 0,
      smart_note_generated: false,
      completion_status: "in_progress",
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
}

function makeInternalReference(prefix: string, courseId: string, studentId: string): string {
  return `${prefix}-${courseId.slice(-4)}-${studentId.slice(-4)}-${Date.now()}`;
}

export async function markCouponRedeemed(payment: PaymentDocument): Promise<void> {
  if (!payment.coupon_id || payment.coupon_redemption_recorded) {
    return;
  }

  const updateResult = await PaymentModel.updateOne(
    {
      _id: payment.id,
      coupon_redemption_recorded: false,
    },
    {
      coupon_redemption_recorded: true,
    },
  );

  if (updateResult.modifiedCount > 0) {
    await CouponModel.findByIdAndUpdate(payment.coupon_id, {
      $inc: { used_count: 1 },
    });
    payment.coupon_redemption_recorded = true;
  }
}

export async function createPaymentRecord(input: {
  student: EnrollmentStudentSnapshot;
  course: EnrollmentCourseSnapshot;
  enrollment: EnrollmentRecordReference;
  pricing: EnrollmentPricing;
  gateway: PaymentGateway;
  source: PaymentSource;
  status: PaymentStatus;
  invoice?: string;
  trx_id?: string;
  paymentID?: string;
  manually_verified_by?: string | null;
}): Promise<PaymentDocument> {
  const invoice =
    input.invoice ??
    makeInternalReference(
      input.gateway === "Manual" ? "MANUAL" : "PAY",
      input.course.id,
      input.student.id,
    );
  const trxId = input.trx_id ?? invoice;

  const payment = await PaymentModel.create({
    trx_id: trxId,
    invoice,
    paymentID: input.paymentID,
    student_id: input.student.id,
    student_name: input.student.name,
    course_id: input.course.id,
    course_name: input.course.title_en,
    amount: input.pricing.final_amount,
    original_amount: input.pricing.original_amount,
    course_discount_amount: input.pricing.course_discount_amount,
    coupon_id: input.pricing.coupon_id,
    coupon_code: input.pricing.coupon_code,
    coupon_discount_amount: input.pricing.coupon_discount_amount,
    manual_discount_amount: input.pricing.manual_discount_amount,
    gateway: input.gateway,
    source: input.source,
    status: input.status,
    submitted_at: new Date().toISOString(),
    manually_verified_by: input.manually_verified_by ?? null,
    enrollment_id: input.enrollment.id,
    coupon_redemption_recorded: false,
  });

  if (input.status === "verified") {
    await markCouponRedeemed(payment);
  }

  return payment;
}

export async function completeEnrollmentWithoutGateway(input: {
  student: EnrollmentStudentSnapshot;
  course: EnrollmentCourseSnapshot;
  enrollment_type: IEnrollment["enrollment_type"];
  pricing: EnrollmentPricing;
  batch_id?: string;
  source: PaymentSource;
  manually_verified_by?: string | null;
}) {
  const paymentStatus =
    input.pricing.final_amount > 0 ? "paid" : "free";

  const enrollment = await upsertEnrollmentRecord({
    student: input.student,
    course: input.course,
    enrollment_type: input.enrollment_type,
    payment_status: paymentStatus,
    pricing: input.pricing,
    batch_id: input.batch_id,
  });

  await ensureEnrollmentProgressSeed({
    student: input.student,
    course: input.course,
  });

  const payment = await createPaymentRecord({
    student: input.student,
    course: input.course,
    enrollment: {
      id: enrollment.id,
    },
    pricing: input.pricing,
    gateway: "Manual",
    source: input.source,
    status: "verified",
    invoice:
      input.source === "admin_manual_enrollment" ? `MANUAL-${enrollment.id}` : undefined,
    trx_id:
      input.source === "admin_manual_enrollment" ? `MANUAL-${enrollment.id}` : undefined,
    manually_verified_by: input.manually_verified_by ?? null,
  });

  await syncEnrolledCourseCount(input.student.id);

  return {
    enrollment,
    payment,
  };
}

export async function syncEnrollmentFromPayment(payment: PaymentDocument) {
  const paymentStatus: IEnrollment["payment_status"] =
    payment.status === "verified"
      ? payment.amount > 0
        ? "paid"
        : "free"
      : payment.status === "failed"
        ? "failed"
        : "pending";

  let enrollment = payment.enrollment_id
    ? await EnrollmentModel.findById(payment.enrollment_id)
    : null;

  if (!enrollment && payment.student_id && payment.course_id) {
    enrollment = await EnrollmentModel.findOne({
      student_id: payment.student_id,
      course_id: payment.course_id,
    });
  }

  if (!enrollment) {
    if (
      payment.status !== "verified" ||
      !payment.student_id ||
      !payment.course_id
    ) {
      return null;
    }

    enrollment = await upsertEnrollmentRecord({
      student: {
        id: payment.student_id,
        name: payment.student_name,
      },
      course: {
        id: payment.course_id,
        title_en: payment.course_name,
      },
      enrollment_type: payment.source === "admin_manual_enrollment" ? "manual" : "auto",
      payment_status: paymentStatus,
      pricing: {
        currency: "BDT",
        original_amount: payment.original_amount,
        course_discount_amount: payment.course_discount_amount,
        subtotal_amount: Math.max(
          0,
          payment.original_amount - payment.course_discount_amount,
        ),
        coupon_id: payment.coupon_id,
        coupon_code: payment.coupon_code,
        coupon_discount_amount: payment.coupon_discount_amount,
        manual_discount_amount: payment.manual_discount_amount,
        final_amount: payment.amount,
        applied_coupon: payment.coupon_id && payment.coupon_code
          ? {
              id: payment.coupon_id,
              code: payment.coupon_code,
              discount_type: "flat",
              discount_value: payment.coupon_discount_amount,
              minimum_purchase_amount: 0,
            }
          : null,
      },
    });
  } else {
    const nextState = resolvePaymentState({
      paymentStatus,
      finalAmount: payment.amount,
    });

    enrollment.payment_status = nextState.payment_status;
    enrollment.original_amount = payment.original_amount;
    enrollment.course_discount_amount = payment.course_discount_amount;
    enrollment.coupon_id = payment.coupon_id;
    enrollment.coupon_code = payment.coupon_code;
    enrollment.coupon_discount_amount = payment.coupon_discount_amount;
    enrollment.manual_discount_amount = payment.manual_discount_amount;
    enrollment.final_amount = payment.amount;
    enrollment.status = nextState.status;
    enrollment.access_status = nextState.access_status;
    await enrollment.save();
  }

  if (payment.status === "verified") {
    await ensureEnrollmentProgressSeed({
      student: {
        id: enrollment.student_id,
        name: enrollment.student_name,
      },
      course: {
        title_en: enrollment.course_name,
      },
    });
    await markCouponRedeemed(payment);
  }

  if (payment.student_id) {
    await syncEnrolledCourseCount(payment.student_id);
  }

  return enrollment;
}
