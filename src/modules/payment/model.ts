import mongoose, { Model, Schema, model } from "mongoose";
import { applyDefaultJsonTransform } from "../../utils/mongoose-transform";

export interface IPayment {
  trx_id: string;
  invoice: string;
  paymentID?: string;
  student_id?: string;
  student_name: string;
  course_id?: string;
  course_name: string;
  amount: number;
  gateway: "bKash" | "Nagad" | "Card";
  status: "pending" | "verified" | "failed";
  submitted_at: string;
  manually_verified_by: string | null;
  enrollment_id?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentTransactionLog {
  payment_id: string;
  trx_id: string;
  gateway: "bKash" | "Nagad" | "Card";
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
    gateway: { type: String, enum: ["bKash", "Nagad", "Card"], required: true },
    status: { type: String, enum: ["pending", "verified", "failed"], required: true },
    submitted_at: { type: String, required: true },
    manually_verified_by: { type: String, default: null },
    enrollment_id: { type: String, default: undefined },
  },
  { timestamps: true },
);

const paymentTransactionLogSchema = new Schema<IPaymentTransactionLog>(
  {
    payment_id: { type: String, required: true, index: true },
    trx_id: { type: String, required: true },
    gateway: { type: String, enum: ["bKash", "Nagad", "Card"], required: true },
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
