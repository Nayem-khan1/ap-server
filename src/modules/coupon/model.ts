import mongoose, { Model, Schema, model } from "mongoose";
import { applyDefaultJsonTransform } from "../../utils/mongoose-transform";

export interface ICoupon {
  code: string;
  discount_type: "percentage" | "flat";
  discount_value: number;
  max_redemption: number;
  used_count: number;
  minimum_purchase_amount: number;
  course_ids: string[];
  expires_at: string;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    discount_type: { type: String, enum: ["percentage", "flat"], required: true },
    discount_value: { type: Number, required: true, min: 0 },
    max_redemption: { type: Number, required: true, min: 1 },
    used_count: { type: Number, default: 0, min: 0 },
    minimum_purchase_amount: { type: Number, default: 0, min: 0 },
    course_ids: { type: [String], default: [] },
    expires_at: { type: String, required: true },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

applyDefaultJsonTransform(couponSchema);

type CouponModel = Model<ICoupon>;

export const CouponModel =
  (mongoose.models.Coupon as CouponModel | undefined) ||
  model<ICoupon>("Coupon", couponSchema);
