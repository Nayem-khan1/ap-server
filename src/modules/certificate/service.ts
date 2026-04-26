import crypto from "crypto";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/app-error";
import { CourseModel } from "../course/model";
import { EnrollmentModel } from "../enrollment/model";
import {
  CertificateEligibilityModel,
  CertificateTemplateModel,
  IssuedCertificateModel,
} from "./model";

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildSimplePdf(lines: string[]): Buffer {
  const streamLines = [
    "BT",
    "/F1 14 Tf",
    "50 780 Td",
    ...lines.flatMap((line, index) => {
      if (index === 0) {
        return [`(${escapePdfText(line)}) Tj`];
      }
      return ["T*", `(${escapePdfText(line)}) Tj`];
    }),
    "ET",
  ];

  const stream = streamLines.join("\n");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 6 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj\n<< >>\nendobj\n",
    "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];

  let content = "%PDF-1.4\n";
  const offsets = [0];
  for (const objectContent of objects) {
    offsets.push(Buffer.byteLength(content, "utf8"));
    content += objectContent;
  }

  const xrefOffset = Buffer.byteLength(content, "utf8");
  content += `xref\n0 ${objects.length + 1}\n`;
  content += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    const offset = String(offsets[i]).padStart(10, "0");
    content += `${offset} 00000 n \n`;
  }
  content += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(content, "utf8");
}

async function generateCertificateNumber(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
    const certificateNo = `APS-CERT-${suffix}`;
    const exists = await IssuedCertificateModel.exists({
      certificate_no: certificateNo,
    });
    if (!exists) return certificateNo;
  }
  throw new AppError(
    StatusCodes.INTERNAL_SERVER_ERROR,
    "Failed to generate unique certificate number",
  );
}

export const certificateService = {
  async listEligibility() {
    const items = await CertificateEligibilityModel.find().sort({ updatedAt: -1 });
    return items.map((item) => item.toJSON());
  },

  async updateEligibility(id: string, payload: Record<string, unknown>) {
    const item = await CertificateEligibilityModel.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Eligibility rule not found");
    return item.toJSON();
  },

  async listTemplates() {
    const items = await CertificateTemplateModel.find().sort({ updatedAt: -1 });
    return items.map((item) => item.toJSON());
  },

  async createTemplate(payload: Record<string, unknown>) {
    const item = await CertificateTemplateModel.create(payload);
    return item.toJSON();
  },

  async updateTemplate(id: string, payload: Record<string, unknown>) {
    const item = await CertificateTemplateModel.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Certificate template not found");
    return item.toJSON();
  },

  async setTemplatePublishStatus(
    id: string,
    publish_status: "draft" | "published" | "archived",
  ) {
    const item = await CertificateTemplateModel.findByIdAndUpdate(
      id,
      { publish_status },
      { new: true },
    );
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Certificate template not found");
    return item.toJSON();
  },

  async bulkDeleteTemplates(ids: string[]) {
    await CertificateTemplateModel.deleteMany({ _id: { $in: ids } });
    await IssuedCertificateModel.deleteMany({ template_id: { $in: ids } });
    return true;
  },

  async listIssued() {
    const items = await IssuedCertificateModel.find().sort({ issued_at: -1 });
    return items.map((item) => item.toJSON());
  },

  async generateIssued(payload: {
    template_id: string;
    linked_course_id: string;
    student_name: string;
    student_id?: string;
    generated_by: string;
    verification_status?: "verified" | "unverified";
    issued_at?: string;
  }) {
    const [course, template] = await Promise.all([
      CourseModel.findById(payload.linked_course_id),
      CertificateTemplateModel.findById(payload.template_id),
    ]);

    if (!course) {
      throw new AppError(StatusCodes.NOT_FOUND, "Linked course not found");
    }

    if (!template) {
      throw new AppError(StatusCodes.NOT_FOUND, "Certificate template not found");
    }

    if (template.linked_course_id !== payload.linked_course_id) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Template does not belong to the selected course",
      );
    }

    const enrollment = await EnrollmentModel.findOne({
      course_id: payload.linked_course_id,
      ...(payload.student_id
        ? { student_id: payload.student_id }
        : { student_name: payload.student_name }),
    });

    if (!enrollment) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Student is not enrolled in this course",
      );
    }

    const eligibility = await CertificateEligibilityModel.findOne({
      course_id: payload.linked_course_id,
    });
    const requiredPercent = eligibility?.minimum_completion_percent ?? 100;

    if (enrollment.progress_percent < requiredPercent) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Course completion must be at least ${requiredPercent}% to issue certificate`,
      );
    }

    if (enrollment.progress_percent < 100) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Course completion must be 100% to issue certificate",
      );
    }

    const existing = await IssuedCertificateModel.findOne({
      linked_course_id: payload.linked_course_id,
      ...(payload.student_id
        ? { student_id: payload.student_id }
        : { student_name: payload.student_name }),
    });
    if (existing) {
      if (
        payload.verification_status === "verified" &&
        existing.verification_status !== "verified"
      ) {
        existing.verification_status = "verified";
        await existing.save();
      }
      return existing.toJSON();
    }

    const item = await IssuedCertificateModel.create({
      certificate_no: await generateCertificateNumber(),
      student_id: payload.student_id,
      student_name: payload.student_name,
      linked_course_id: payload.linked_course_id,
      linked_course_name: course.title_en,
      template_id: payload.template_id,
      issued_at: payload.issued_at ?? new Date().toISOString(),
      verification_status: payload.verification_status ?? "unverified",
      generated_by: payload.generated_by,
    });
    return item.toJSON();
  },

  async setIssuedVerificationStatus(
    id: string,
    verification_status: "verified" | "unverified",
  ) {
    const item = await IssuedCertificateModel.findByIdAndUpdate(
      id,
      { verification_status },
      { new: true },
    );
    if (!item) throw new AppError(StatusCodes.NOT_FOUND, "Issued certificate not found");
    return item.toJSON();
  },

  async verifyByCertificateNo(certificateNo: string) {
    const item = await IssuedCertificateModel.findOne({
      certificate_no: certificateNo.trim().toUpperCase(),
    });
    if (!item) return null;
    if (item.verification_status !== "verified") {
      item.verification_status = "verified";
      await item.save();
    }
    return item.toJSON();
  },

  async generateIssuedPdf(id: string) {
    const issued = await IssuedCertificateModel.findById(id);
    if (!issued) {
      throw new AppError(StatusCodes.NOT_FOUND, "Issued certificate not found");
    }

    const lines = [
      "Astronomy Pathshala Certificate",
      `Certificate No: ${issued.certificate_no}`,
      `Student: ${issued.student_name}`,
      `Course: ${issued.linked_course_name}`,
      `Issued At: ${issued.issued_at}`,
      `Verification: ${issued.verification_status}`,
    ];

    const pdfBuffer = buildSimplePdf(lines);

    return {
      certificate_no: issued.certificate_no,
      file_name: `${issued.certificate_no}.pdf`,
      pdf_base64: pdfBuffer.toString("base64"),
    };
  },
};
