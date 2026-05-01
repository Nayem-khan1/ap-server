import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/app-error";
import { CouponModel } from "./model";

function normalizeCouponPayload(payload: Record<string, unknown>) {
  const discount_value =
    typeof payload.discount_value === "number"
      ? payload.discount_value
      : typeof payload.value === "number"
        ? payload.value
        : undefined;

  const max_redemption =
    typeof payload.max_redemption === "number"
      ? payload.max_redemption
      : typeof payload.usage_limit === "number"
        ? payload.usage_limit
        : undefined;

  const expires_at =
    typeof payload.expires_at === "string"
      ? payload.expires_at
      : typeof payload.expiry === "string"
        ? payload.expiry
        : undefined;

  const minimum_purchase_amount =
    typeof payload.minimum_purchase_amount === "number"
      ? payload.minimum_purchase_amount
      : undefined;

  const course_ids = Array.isArray(payload.course_ids)
    ? Array.from(
        new Set(
          payload.course_ids.filter(
            (item): item is string => typeof item === "string" && item.trim().length > 0,
          ),
        ),
      )
    : undefined;

  return {
    ...payload,
    discount_value,
    max_redemption,
    minimum_purchase_amount,
    course_ids,
    expires_at,
  } as Record<string, unknown>;
}

export const couponService = {
  async listCoupons() {
    const items = await CouponModel.find().sort({ updatedAt: -1 });
    return items.map((item) => item.toJSON());
  },

  async createCoupon(payload: {
    code: string;
    discount_type: "percentage" | "flat";
    discount_value?: number;
    value?: number;
    max_redemption?: number;
    usage_limit?: number;
    expires_at?: string;
    expiry?: string;
    minimum_purchase_amount?: number;
    course_ids?: string[];
    is_active: boolean;
  }) {
    const normalized = normalizeCouponPayload(payload);
    const item = await CouponModel.create({
      ...normalized,
      code: payload.code.trim().toUpperCase(),
    });
    return item.toJSON();
  },

  async updateCoupon(id: string, payload: Record<string, unknown>) {
    const data = normalizeCouponPayload({ ...payload });
    if (typeof data.code === "string") {
      data.code = data.code.trim().toUpperCase();
    }

    const item = await CouponModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Coupon not found");
    return item.toJSON();
  },

  async setCouponActive(id: string, isActive: boolean) {
    const item = await CouponModel.findByIdAndUpdate(
      id,
      { is_active: isActive },
      { new: true },
    );
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Coupon not found");
    return item.toJSON();
  },

  async bulkDeleteCoupons(ids: string[]) {
    await CouponModel.deleteMany({ _id: { $in: ids } });
    return true;
  },
};
