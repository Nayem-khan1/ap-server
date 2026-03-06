import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/app-error";
import {
  BkashExecuteTimeoutError,
  bkashCreatePayment,
  bkashExecutePayment,
  bkashQueryPayment,
  bkashRefundPayment,
} from "../../utils/bkash";
import { env } from "../../config/env";
import { CourseModel } from "../course/model";
import { EnrollmentModel } from "../enrollment/model";
import { UserModel } from "../user/model";
import { PaymentModel, PaymentTransactionLogModel } from "./model";

function makeInvoiceId(courseId: string, studentId: string): string {
  return `BKASH-${courseId.slice(-4)}-${studentId.slice(-4)}-${Date.now()}`;
}

type CallbackRedirectStatus = "success" | "failed";

function appendQueryParams(
  baseUrl: string,
  params: Record<string, string | undefined>,
): string {
  const url = new URL(baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function resolveCallbackRedirectUrl(
  status: CallbackRedirectStatus,
  payment: Record<string, unknown>,
  reason?: string,
  statusCode?: string,
  statusMessage?: string,
  transactionStatus?: string,
): string | null {
  const successFallbackUrl = "http://localhost:3000/payment/success";
  const failureFallbackUrl = "http://localhost:3000/payment/fail";
  let baseUrl = "";

  if (status === "success") {
    baseUrl = env.BKASH_CALLBACK_SUCCESS.trim() || successFallbackUrl;
  } else {
    baseUrl = env.BKASH_CALLBACK_FAIL.trim() || failureFallbackUrl;
  }

  return appendQueryParams(baseUrl, {
    status,
    payment_id: String(payment.id ?? ""),
    invoice: String(payment.invoice ?? ""),
    paymentID: String(payment.paymentID ?? ""),
    trx_id: String(payment.trx_id ?? ""),
    reason,
    statusCode,
    statusMessage,
    transactionStatus,
  });
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
): Promise<{
  verified: boolean;
  payment: Record<string, unknown>;
  statusCode: string;
  statusMessage: string;
  transactionStatus: string;
  verificationSource: "execute" | "query_after_execute_timeout";
}> {
  const executionRef = paymentID || payment.paymentID || payment.trx_id;
  let executeResult;
  let verificationSource: "execute" | "query_after_execute_timeout" = "execute";

  try {
    executeResult = await bkashExecutePayment(executionRef);
  } catch (error) {
    if (error instanceof BkashExecuteTimeoutError) {
      executeResult = await bkashQueryPayment(executionRef);
      verificationSource = "query_after_execute_timeout";
    } else {
      throw error;
    }
  }

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
    reason: verified
      ? "Payment executed successfully"
      : executeResult.statusMessage || "Execution failed",
    gateway_response: {
      verification_source: verificationSource,
      statusCode: executeResult.statusCode,
      statusMessage: executeResult.statusMessage,
      transactionStatus: executeResult.transactionStatus,
      raw: executeResult.raw,
    },
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
    statusCode: executeResult.statusCode,
    statusMessage: executeResult.statusMessage,
    transactionStatus: executeResult.transactionStatus,
    verificationSource,
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
      const redirectStatus: CallbackRedirectStatus = "failed";
      return {
        redirect_status: redirectStatus,
        payment: null,
        redirect_url: resolveCallbackRedirectUrl(
          redirectStatus,
          {},
          "Payment reference not found",
        ),
      };
    }

    const callbackStatus = (query.status ?? "").trim().toLowerCase();
    if (callbackStatus !== "success") {
      const redirectStatus: CallbackRedirectStatus = "failed";
      const failureReason =
        callbackStatus === "cancel"
          ? "Payment cancelled by user"
          : callbackStatus === "failure" || callbackStatus === "failed"
            ? "Payment failed"
            : callbackStatus
              ? `Payment failed with status: ${query.status}`
              : "Payment callback status missing";

      payment.status = "failed";
      await payment.save();
      await lockEnrollmentForPayment(payment);

      await PaymentTransactionLogModel.create({
        payment_id: payment.id,
        trx_id: payment.trx_id,
        gateway: "bKash",
        status: "failed",
        reason: failureReason,
        gateway_response: {
          ...query,
          callback_status: callbackStatus || "unknown",
        },
      });

      const paymentJson = payment.toJSON() as Record<string, unknown>;
      return {
        redirect_status: redirectStatus,
        payment: paymentJson,
        redirect_url: resolveCallbackRedirectUrl(
          redirectStatus,
          paymentJson,
          failureReason,
        ),
      };
    }

    const result = await executeGatewayPayment(payment, query.paymentID);
    const redirectStatus: CallbackRedirectStatus = result.verified
      ? "success"
      : "failed";

    return {
      redirect_status: redirectStatus,
      payment: result.payment,
      redirect_url: resolveCallbackRedirectUrl(
        redirectStatus,
        result.payment,
        result.verified ? undefined : result.statusMessage || "Payment verification failed",
        result.statusCode,
        result.statusMessage,
        result.transactionStatus,
      ),
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

  async refundBkashPayment(payload: {
    payment_id?: string;
    paymentID?: string;
    invoice?: string;
    trxID?: string;
    amount: number;
    reason: string;
    sku?: string;
  }) {
    const payment = await resolveGatewayPayment(payload);
    if (!payment) {
      throw new AppError(StatusCodes.NOT_FOUND, "Payment reference not found");
    }

    const paymentID = payload.paymentID || payment.paymentID;
    if (!paymentID) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "bKash paymentID is required for refund",
      );
    }

    const trxID = payload.trxID || payment.trx_id;
    if (!trxID) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Transaction ID is required for refund");
    }

    const refundResult = await bkashRefundPayment({
      paymentID,
      trxID,
      amount: payload.amount,
      reason: payload.reason,
      sku: payload.sku,
    });

    await PaymentTransactionLogModel.create({
      payment_id: payment.id,
      trx_id: trxID,
      gateway: "bKash",
      status: refundResult.isSuccessful ? "success" : "failed",
      reason: refundResult.isSuccessful
        ? "Payment refunded successfully"
        : refundResult.statusMessage || "Refund failed",
      gateway_response: {
        action: "refund",
        statusCode: refundResult.statusCode,
        statusMessage: refundResult.statusMessage,
        refundTrxID: refundResult.refundTrxID,
        raw: refundResult.raw,
      },
    });

    if (refundResult.isSuccessful) {
      payment.status = "failed";
      payment.manually_verified_by = "bKash Refund";
      await payment.save();
      await lockEnrollmentForPayment(payment);
    }

    return {
      payment: payment.toJSON(),
      refund: {
        refundTrxID: refundResult.refundTrxID,
        statusCode: refundResult.statusCode,
        statusMessage: refundResult.statusMessage,
        isSuccessful: refundResult.isSuccessful,
      },
    };
  },
};
