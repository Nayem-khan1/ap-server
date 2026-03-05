import { CourseModel } from "../course/model";
import { EnrollmentModel, ProgressModel } from "../enrollment/model";
import { PaymentModel } from "../payment/model";
import { UserModel } from "../user/model";
import { IssuedCertificateModel } from "../certificate/model";

type AnalyticsRange = "7d" | "30d" | "90d" | "12m";

function nowDate(): Date {
  return new Date();
}

function safeDate(value: unknown): Date {
  const date = new Date(typeof value === "string" ? value : "");
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function buildDailyBuckets(days: number) {
  const buckets: Array<{ label: string; from: Date; to: Date }> = [];
  const now = nowDate();
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    buckets.push({
      label: day.toLocaleDateString("en-US", { weekday: "short" }),
      from: day,
      to: next,
    });
  }
  return buckets;
}

function buildMonthlyBuckets(months: number) {
  const buckets: Array<{ label: string; from: Date; to: Date }> = [];
  const now = nowDate();
  for (let i = months - 1; i >= 0; i -= 1) {
    const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    buckets.push({
      label: from.toLocaleDateString("en-US", { month: "short" }),
      from,
      to,
    });
  }
  return buckets;
}

function buildBuckets(range: AnalyticsRange) {
  if (range === "7d") return buildDailyBuckets(7);
  if (range === "30d") return buildDailyBuckets(30);
  if (range === "90d") return buildDailyBuckets(90);
  return buildMonthlyBuckets(12);
}

function countByBuckets<T>(
  items: T[],
  dateSelector: (item: T) => Date,
  valueSelector: (item: T) => number = () => 1,
  range: AnalyticsRange,
) {
  const buckets = buildBuckets(range);
  return buckets.map((bucket) => {
    const value = items.reduce((sum, item) => {
      const date = dateSelector(item);
      if (date >= bucket.from && date < bucket.to) {
        return sum + valueSelector(item);
      }
      return sum;
    }, 0);
    return { label: bucket.label, value };
  });
}

export const analyticsService = {
  async summary() {
    const [
      totalStudents,
      totalCourses,
      totalEnrollments,
      activeEnrollments,
      verifiedPayments,
      progressRecords,
      issuedCertificates,
    ] = await Promise.all([
      UserModel.countDocuments({ role: "student" }),
      CourseModel.countDocuments(),
      EnrollmentModel.countDocuments(),
      EnrollmentModel.countDocuments({ status: "active" }),
      PaymentModel.find({ status: "verified" }),
      ProgressModel.find(),
      IssuedCertificateModel.countDocuments(),
    ]);

    const revenue = verifiedPayments.reduce((sum, item) => sum + item.amount, 0);
    const completedCount = progressRecords.filter(
      (item) => item.completion_status === "completed",
    ).length;
    const course_completion_rate =
      progressRecords.length > 0
        ? Number(((completedCount / progressRecords.length) * 100).toFixed(2))
        : 0;
    const average_quiz_score =
      progressRecords.length > 0
        ? Number(
            (
              progressRecords.reduce((sum, item) => sum + item.quiz_score, 0) /
              progressRecords.length
            ).toFixed(2),
          )
        : 0;

    return {
      total_students: totalStudents,
      total_courses: totalCourses,
      total_enrollments: totalEnrollments,
      active_enrollments: activeEnrollments,
      revenue,
      course_completion_rate,
      average_quiz_score,
      issued_certificates: issuedCertificates,
    };
  },

  async revenueGrowth(range: AnalyticsRange) {
    const payments = await PaymentModel.find({ status: "verified" });
    return countByBuckets(
      payments,
      (item) => safeDate(item.submitted_at),
      (item) => item.amount,
      range,
    );
  },

  async enrollmentGrowth(range: AnalyticsRange) {
    const enrollments = await EnrollmentModel.find();
    return countByBuckets(
      enrollments,
      (item) => safeDate(item.enrolled_at),
      () => 1,
      range,
    );
  },

  async userGrowth(range: AnalyticsRange) {
    const students = await UserModel.find({ role: "student" });
    return countByBuckets(students, (item) => safeDate(item.createdAt), () => 1, range);
  },

  async coursePopularity(_range: AnalyticsRange) {
    const enrollments = await EnrollmentModel.find();
    const counts = new Map<string, number>();
    for (const enrollment of enrollments) {
      counts.set(
        enrollment.course_name,
        (counts.get(enrollment.course_name) ?? 0) + 1,
      );
    }

    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  },
};

