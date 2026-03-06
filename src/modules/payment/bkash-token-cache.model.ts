import mongoose, { Model, Schema, model } from "mongoose";
import { applyDefaultJsonTransform } from "../../utils/mongoose-transform";

export interface IBkashTokenCache {
  key: string;
  id_token: string;
  expires_at: Date;
  grant_window_start: Date;
  grant_call_count: number;
  createdAt: Date;
  updatedAt: Date;
}

const bkashTokenCacheSchema = new Schema<IBkashTokenCache>(
  {
    key: { type: String, required: true, unique: true, index: true },
    id_token: { type: String, required: true },
    expires_at: { type: Date, required: true },
    grant_window_start: { type: Date, required: true },
    grant_call_count: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true },
);

applyDefaultJsonTransform(bkashTokenCacheSchema);

type BkashTokenCacheModel = Model<IBkashTokenCache>;

export const BkashTokenCacheModel =
  (mongoose.models.BkashTokenCache as BkashTokenCacheModel | undefined) ||
  model<IBkashTokenCache>("BkashTokenCache", bkashTokenCacheSchema);
