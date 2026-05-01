import mongoose, { Model, Schema, model } from "mongoose";
import { applyDefaultJsonTransform } from "../../utils/mongoose-transform";

export type PaymentGateway = "bKash" | "Nagad" | "Card" | "Manual";
export type PaymentStatus = "pending" | "verified" | "failed";
export type PaymentSource =
  | "public_checkout"
  | "admin_manual_enrollment"
  | "auto_free_enrollment";

export interface IPayment {
  trx_id: string;
  invoice: string;
  paymentID?: string;
  student_id?: string;
  student_name: string;
  course_id?: string;
  course_name: string;
  amount: number;
  original_amount: number;
  course_discount_amount: number;
  coupon_id?: string;
  coupon_code?: string;
  coupon_discount_amount: number;
  manual_discount_amount: number;
  gateway: PaymentGateway;
  source: PaymentSource;
  status: PaymentStatus;
  submitted_at: string;
  manually_verified_by: string | null;
  enrollment_id?: string;
  coupon_redemption_recorded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentTransactionLog {
  payment_id: string;
  trx_id: string;
  gateway: PaymentGateway;
  status: "success" | "failed";
  reason: string;
  gateway_response: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    trx_id: { type: String, required: true, unique: true, index: true },
    invoice: { type: String, required: true, unique: true, index: true },
    paymentID: { type: String, default: undefined, index: true },
    student_id: { type: String, default: undefined, index: true },
    student_name: { type: String, required: true },
    course_id: { type: String, default: undefined, index: true },
    course_name: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    original_amount: { type: Number, default: 0, min: 0 },
    course_discount_amount: { type: Number, default: 0, min: 0 },
    coupon_id: { type: String, default: undefined, index: true },
    coupon_code: { type: String, default: undefined },
    coupon_discount_amount: { type: Number, default: 0, min: 0 },
    manual_discount_amount: { type: Number, default: 0, min: 0 },
    gateway: {
      type: String,
      enum: ["bKash", "Nagad", "Card", "Manual"],
      required: true,
    },
    source: {
      type: String,
      enum: ["public_checkout", "admin_manual_enrollment", "auto_free_enrollment"],
      default: "public_checkout",
    },
    status: { type: String, enum: ["pending", "verified", "failed"], required: true },
    submitted_at: { type: String, required: true },
    manually_verified_by: { type: String, default: null },
    enrollment_id: { type: String, default: undefined },
    coupon_redemption_recorded: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const paymentTransactionLogSchema = new Schema<IPaymentTransactionLog>(
  {
    payment_id: { type: String, required: true, index: true },
    trx_id: { type: String, required: true },
    gateway: {
      type: String,
      enum: ["bKash", "Nagad", "Card", "Manual"],
      required: true,
    },
    status: { type: String, enum: ["success", "failed"], required: true },
    reason: { type: String, required: true },
    gateway_response: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

applyDefaultJsonTransform(paymentSchema);
applyDefaultJsonTransform(paymentTransactionLogSchema);

type PaymentModel = Model<IPayment>;
type PaymentLogModel = Model<IPaymentTransactionLog>;

export const PaymentModel =
  (mongoose.models.Payment as PaymentModel | undefined) ||
  model<IPayment>("Payment", paymentSchema);

export const PaymentTransactionLogModel =
  (mongoose.models.PaymentTransactionLog as PaymentLogModel | undefined) ||
  model<IPaymentTransactionLog>("PaymentTransactionLog", paymentTransactionLogSchema);
