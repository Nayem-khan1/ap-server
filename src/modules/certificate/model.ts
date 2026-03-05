import mongoose, { Model, Schema, model } from "mongoose";
import { applyDefaultJsonTransform } from "../../utils/mongoose-transform";

export interface ICertificateEligibility {
  course_id: string;
  minimum_completion_percent: number;
  quiz_pass_required: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICertificateTemplate {
  linked_course_id: string;
  completion_required_percentage: number;
  template_upload: string;
  publish_status: "draft" | "published" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

export interface IIssuedCertificate {
  certificate_no: string;
  student_name: string;
  linked_course_id: string;
  linked_course_name: string;
  template_id: string;
  issued_at: string;
  verification_status: "verified" | "unverified";
  generated_by: string;
  createdAt: Date;
  updatedAt: Date;
}

const eligibilitySchema = new Schema<ICertificateEligibility>(
  {
    course_id: { type: String, required: true, unique: true, index: true },
    minimum_completion_percent: { type: Number, required: true, min: 0, max: 100 },
    quiz_pass_required: { type: Boolean, required: true },
  },
  { timestamps: true },
);

const templateSchema = new Schema<ICertificateTemplate>(
  {
    linked_course_id: { type: String, required: true, index: true },
    completion_required_percentage: { type: Number, required: true, min: 0, max: 100 },
    template_upload: { type: String, required: true },
    publish_status: {
      type: String,
      enum: ["draft", "published", "archived"],
      required: true,
    },
  },
  { timestamps: true },
);

const issuedSchema = new Schema<IIssuedCertificate>(
  {
    certificate_no: { type: String, required: true, unique: true, index: true },
    student_name: { type: String, required: true },
    linked_course_id: { type: String, required: true, index: true },
    linked_course_name: { type: String, required: true },
    template_id: { type: String, required: true, index: true },
    issued_at: { type: String, required: true },
    verification_status: {
      type: String,
      enum: ["verified", "unverified"],
      required: true,
      index: true,
    },
    generated_by: { type: String, required: true },
  },
  { timestamps: true },
);

applyDefaultJsonTransform(eligibilitySchema);
applyDefaultJsonTransform(templateSchema);
applyDefaultJsonTransform(issuedSchema);

type EligibilityModel = Model<ICertificateEligibility>;
type TemplateModel = Model<ICertificateTemplate>;
type IssuedModel = Model<IIssuedCertificate>;

export const CertificateEligibilityModel =
  (mongoose.models.CertificateEligibility as EligibilityModel | undefined) ||
  model<ICertificateEligibility>("CertificateEligibility", eligibilitySchema);

export const CertificateTemplateModel =
  (mongoose.models.CertificateTemplate as TemplateModel | undefined) ||
  model<ICertificateTemplate>("CertificateTemplate", templateSchema);

export const IssuedCertificateModel =
  (mongoose.models.IssuedCertificate as IssuedModel | undefined) ||
  model<IIssuedCertificate>("IssuedCertificate", issuedSchema);

