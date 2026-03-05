import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/app-error";
import { bkashCreatePayment, bkashExecutePayment } from "../../utils/bkash";
import { CourseModel } from "../course/model";
import { EnrollmentModel } from "../enrollment/model";
import { UserModel } from "../user/model";
import { PaymentModel, PaymentTransactionLogModel } from "./model";

function makeInvoiceId(courseId: string, studentId: string): string {
  return `BKASH-${courseId.slice(-4)}-${studentId.slice(-4)}-${Date.now()}`;
}

async function lockEnrollmentForPayment(payment: any): Promise<void> {
  if (!payment.enrollment_id) {
    return;
  }

  await EnrollmentModel.findByIdAndUpdate(payment.enrollment_id, {
    payment_status: "pending",
    status: "paused",
    access_status: "locked",
  });
}

async function unlockEnrollmentForPayment(payment: any) {
  const enrollmentFilter = payment.enrollment_id
    ? { _id: payment.enrollment_id }
    : {
        student_name: payment.student_name,
        course_name: payment.course_name,
      };

  const enrollment = await EnrollmentModel.findOneAndUpdate(
    enrollmentFilter,
    {
      status: "active",
      access_status: "active",
      payment_status: payment.status === "verified" ? "paid" : "pending",
    },
    { new: true },
  );

  return enrollment ? enrollment.toJSON() : true;
}

async function resolveGatewayPayment(input: {
  payment_id?: string;
  paymentID?: string;
  invoice?: string;
}) {
  if (input.payment_id) {
    const item = await PaymentModel.findOne({ _id: input.payment_id, gateway: "bKash" });
    if (item) return item;
  }

  if (input.invoice) {
    const item = await PaymentModel.findOne({ invoice: input.invoice, gateway: "bKash" });
    if (item) return item;
  }

  if (input.paymentID) {
    const item = await PaymentModel.findOne({ paymentID: input.paymentID, gateway: "bKash" });
    if (item) return item;
  }

  return null;
}

async function executeGatewayPayment(
  payment: any,
  paymentID?: string,
): Promise<{ verified: boolean; payment: Record<string, unknown> }> {
  const executionRef = paymentID || payment.paymentID || payment.trx_id;
  const executeResult = await bkashExecutePayment(executionRef);
  const verified = executeResult.isSuccessful;

  payment.status = verified ? "verified" : "failed";
  payment.paymentID = paymentID || payment.paymentID || executionRef;
  payment.trx_id = executeResult.trxID || payment.trx_id;
  payment.manually_verified_by = verified ? "bKash Auto Verify" : null;
  await payment.save();

  await PaymentTransactionLogModel.create({
    payment_id: payment.id,
    trx_id: payment.trx_id,
    gateway: "bKash",
    status: verified ? "success" : "failed",
    reason: verified ? "Payment executed successfully" : "Execution failed",
    gateway_response: executeResult.raw,
  });

  if (verified) {
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
      enrollment = await EnrollmentModel.create({
        student_id: payment.student_id ?? "",
        student_name: payment.student_name,
        course_id: payment.course_id ?? "",
        course_name: payment.course_name,
        enrolled_at: new Date().toISOString(),
        enrollment_type: "auto",
        payment_status: "paid",
        progress_percent: 0,
        completed_lessons: [],
        completed_at: null,
        status: "active",
        access_status: "active",
      });
    } else {
      enrollment.status = "active";
      enrollment.access_status = "active";
      enrollment.payment_status = "paid";
      await enrollment.save();
    }
  } else {
    await lockEnrollmentForPayment(payment);
  }

  return {
    verified,
    payment: payment.toJSON(),
  };
}

export const paymentService = {
  async listPayments(query: Record<string, unknown>) {
    const filter: Record<string, unknown> = {};

    if (typeof query.search === "string" && query.search.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { trx_id: { $regex: search, $options: "i" } },
        { student_name: { $regex: search, $options: "i" } },
        { course_name: { $regex: search, $options: "i" } },
      ];
    }

    const items = await PaymentModel.find(filter).sort({ submitted_at: -1 });
    return items.map((item) => item.toJSON());
  },

  async verifyPayment(id: string, verifierName: string) {
    const payment = await PaymentModel.findByIdAndUpdate(
      id,
      { status: "verified", manually_verified_by: verifierName },
      { new: true },
    );
    if (!payment) throw new AppError(StatusCodes.NOT_FOUND, "Payment not found");
    return payment.toJSON();
  },

  async updatePaymentStatus(
    id: string,
    status: "pending" | "verified" | "failed",
    verifierName?: string,
  ) {
    const payment = await PaymentModel.findByIdAndUpdate(
      id,
      {
        status,
        manually_verified_by: status === "verified" ? verifierName ?? null : null,
      },
      { new: true },
    );
    if (!payment) throw new AppError(StatusCodes.NOT_FOUND, "Payment not found");
    return payment.toJSON();
  },

  async unlockEnrollment(id: string) {
    const payment = await PaymentModel.findById(id);
    if (!payment) throw new AppError(StatusCodes.NOT_FOUND, "Payment not found");

    return unlockEnrollmentForPayment(payment);
  },

  async bulkDelete(ids: string[]) {
    await PaymentModel.deleteMany({ _id: { $in: ids } });
    return true;
  },

  async initBkashPayment(payload: {
    student_id: string;
    course_id: string;
    amount: number;
  }) {
    const [student, course] = await Promise.all([
      UserModel.findById(payload.student_id),
      CourseModel.findById(payload.course_id),
    ]);

    if (!student || student.role !== "student") {
      throw new AppError(StatusCodes.NOT_FOUND, "Student not found");
    }

    if (!course) {
      throw new AppError(StatusCodes.NOT_FOUND, "Course not found");
    }

    if (course.is_free) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "This course is free and does not require bKash payment",
      );
    }

    const enrollment = await EnrollmentModel.findOneAndUpdate(
      {
        student_id: payload.student_id,
        course_id: payload.course_id,
      },
      {
        student_id: payload.student_id,
        student_name: student.name,
        course_id: payload.course_id,
        course_name: course.title_en,
        enrolled_at: new Date().toISOString(),
        enrollment_type: "auto",
        payment_status: "pending",
        progress_percent: 0,
        completed_lessons: [],
        completed_at: null,
        status: "paused",
        access_status: "locked",
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );

    const invoice = makeInvoiceId(payload.course_id, payload.student_id);
    const initResult = await bkashCreatePayment({
      amount: payload.amount,
      invoiceNumber: invoice,
    });

    const payment = await PaymentModel.create({
      trx_id: invoice,
      invoice,
      paymentID: initResult.paymentID,
      student_id: payload.student_id,
      student_name: student.name,
      course_id: payload.course_id,
      course_name: course.title_en,
      amount: payload.amount,
      gateway: "bKash",
      status: "pending",
      submitted_at: new Date().toISOString(),
      enrollment_id: enrollment.id,
    });

    await PaymentTransactionLogModel.create({
      payment_id: payment.id,
      trx_id: invoice,
      gateway: "bKash",
      status: "success",
      reason: "Payment initialized",
      gateway_response: initResult,
    });

    return {
      payment_id: payment.id,
      enrollment_id: enrollment.id,
      payment_ref: initResult.paymentID,
      bkash_url: initResult.bkashURL,
      invoice,
    };
  },

  async handleBkashCallback(query: {
    paymentID?: string;
    status?: string;
    invoice?: string;
  }) {
    const payment = await resolveGatewayPayment({
      paymentID: query.paymentID,
      invoice: query.invoice,
    });

    if (!payment) {
      throw new AppError(StatusCodes.NOT_FOUND, "Payment reference not found");
    }

    if (query.status && query.status.toLowerCase() !== "success") {
      payment.status = "failed";
      await payment.save();
      await lockEnrollmentForPayment(payment);

      await PaymentTransactionLogModel.create({
        payment_id: payment.id,
        trx_id: payment.trx_id,
        gateway: "bKash",
        status: "failed",
        reason: "Callback status not success",
        gateway_response: query,
      });
      return { redirect_status: "failed", payment: payment.toJSON() };
    }

    const result = await executeGatewayPayment(payment, query.paymentID);

    return {
      redirect_status: result.verified ? "success" : "failed",
      payment: result.payment,
    };
  },

  async executeBkashPayment(payload: {
    payment_id?: string;
    paymentID?: string;
    invoice?: string;
  }) {
    const payment = await resolveGatewayPayment(payload);
    if (!payment) {
      throw new AppError(StatusCodes.NOT_FOUND, "Payment reference not found");
    }

    const result = await executeGatewayPayment(payment, payload.paymentID);
    return {
      redirect_status: result.verified ? "success" : "failed",
      payment: result.payment,
    };
  },
};
