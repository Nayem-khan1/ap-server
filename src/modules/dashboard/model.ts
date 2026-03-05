import mongoose, { Model, Schema, model } from "mongoose";
import { applyDefaultJsonTransform } from "../../utils/mongoose-transform";

export interface IDashboardSnapshot {
  key: string;
  payload: unknown;
  generated_at: string;
  createdAt: Date;
  updatedAt: Date;
}

const dashboardSnapshotSchema = new Schema<IDashboardSnapshot>(
  {
    key: { type: String, required: true, unique: true },
    payload: { type: Schema.Types.Mixed, required: true },
    generated_at: { type: String, required: true },
  },
  { timestamps: true },
);

applyDefaultJsonTransform(dashboardSnapshotSchema);

type DashboardSnapshotModel = Model<IDashboardSnapshot>;

export const DashboardSnapshotModel =
  (mongoose.models.DashboardSnapshot as DashboardSnapshotModel | undefined) ||
  model<IDashboardSnapshot>("DashboardSnapshot", dashboardSnapshotSchema);

