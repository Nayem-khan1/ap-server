import mongoose, { Model, Schema, model } from "mongoose";
import { applyDefaultJsonTransform } from "../../utils/mongoose-transform";

export interface IAnalyticsSnapshot {
  key: string;
  range: "7d" | "30d" | "90d" | "12m";
  payload: unknown;
  generated_at: string;
  createdAt: Date;
  updatedAt: Date;
}

const analyticsSnapshotSchema = new Schema<IAnalyticsSnapshot>(
  {
    key: { type: String, required: true, index: true },
    range: { type: String, enum: ["7d", "30d", "90d", "12m"], required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    generated_at: { type: String, required: true },
  },
  { timestamps: true },
);

analyticsSnapshotSchema.index({ key: 1, range: 1 }, { unique: true });

applyDefaultJsonTransform(analyticsSnapshotSchema);

type AnalyticsSnapshotModel = Model<IAnalyticsSnapshot>;

export const AnalyticsSnapshotModel =
  (mongoose.models.AnalyticsSnapshot as AnalyticsSnapshotModel | undefined) ||
  model<IAnalyticsSnapshot>("AnalyticsSnapshot", analyticsSnapshotSchema);

