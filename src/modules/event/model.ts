import mongoose, { Model, Schema, model } from "mongoose";
import { applyDefaultJsonTransform } from "../../utils/mongoose-transform";

export interface IEvent {
  title_en: string;
  title_bn: string;
  slug: string;
  description_en: string;
  description_bn: string;
  banner: string;
  event_date: string;
  registration_fee: number;
  max_participants: number;
  registered_count: number;
  publish_status: "draft" | "published" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

export interface IEventRegistration {
  event_id: string;
  event_title: string;
  student_name: string;
  payment_status: "pending" | "paid" | "failed";
  registered_at: string;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title_en: { type: String, required: true },
    title_bn: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description_en: { type: String, required: true },
    description_bn: { type: String, required: true },
    banner: { type: String, default: "" },
    event_date: { type: String, required: true, index: true },
    registration_fee: { type: Number, required: true, min: 0 },
    max_participants: { type: Number, required: true, min: 1 },
    registered_count: { type: Number, default: 0, min: 0 },
    publish_status: {
      type: String,
      enum: ["draft", "published", "archived"],
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

const eventRegistrationSchema = new Schema<IEventRegistration>(
  {
    event_id: { type: String, required: true, index: true },
    event_title: { type: String, required: true },
    student_name: { type: String, required: true },
    payment_status: { type: String, enum: ["pending", "paid", "failed"], required: true },
    registered_at: { type: String, required: true },
  },
  { timestamps: true },
);

applyDefaultJsonTransform(eventSchema);
applyDefaultJsonTransform(eventRegistrationSchema);

type EventModel = Model<IEvent>;
type EventRegistrationModel = Model<IEventRegistration>;

export const EventModel =
  (mongoose.models.Event as EventModel | undefined) ||
  model<IEvent>("Event", eventSchema);

export const EventRegistrationModel =
  (mongoose.models.EventRegistration as EventRegistrationModel | undefined) ||
  model<IEventRegistration>("EventRegistration", eventRegistrationSchema);
