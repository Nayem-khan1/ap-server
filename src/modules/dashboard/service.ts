import { analyticsService } from "../analytics/service";
import { CourseModel } from "../course/model";
import { EnrollmentModel } from "../enrollment/model";
import { EventModel } from "../event/model";
import { PaymentModel } from "../payment/model";

export const dashboardService = {
  async getAnalytics() {
    const [summary, enrollmentGrowth, revenueGrowth, coursePopularity] = await Promise.all([
      analyticsService.summary(),
      analyticsService.enrollmentGrowth("12m"),
      analyticsService.revenueGrowth("12m"),
      analyticsService.coursePopularity("12m"),
    ]);

    const [recentEnrollments, recentPayments] = await Promise.all([
      EnrollmentModel.find().sort({ enrolled_at: -1 }).limit(5),
      PaymentModel.find().sort({ submitted_at: -1 }).limit(5),
    ]);

    const totalRevenue = summary.revenue;
    const totalStudents = summary.total_students;
    const totalCourses = await CourseModel.countDocuments();
    const totalEvents = await EventModel.countDocuments();
    const totalEnrollments = await EnrollmentModel.countDocuments();

    return {
      stats: {
        totalStudents,
        totalRevenue,
        totalCourses,
        totalEvents,
        totalEnrollments,
      },
      enrollmentChart: enrollmentGrowth.map((point) => ({
        month: point.label,
        enrollments: point.value,
      })),
      revenueChart: revenueGrowth.map((point) => ({
        month: point.label,
        revenue: point.value,
      })),
      coursePopularityChart: coursePopularity.map((point) => ({
        course: point.label,
        enrollments: point.value,
      })),
      recentEnrollments: recentEnrollments.map((item) => ({
        id: item.id,
        student_name: item.student_name,
        course_name: item.course_name,
        date: item.enrolled_at,
        status: item.status === "paused" ? "pending" : item.status,
      })),
      recentPayments: recentPayments.map((item) => ({
        id: item.id,
        trx_id: item.trx_id,
        student_name: item.student_name,
        amount: item.amount,
        method: item.gateway,
        status:
          item.status === "verified" ? "paid" : item.status === "failed" ? "failed" : "pending",
        date: item.submitted_at,
      })),
    };
  },
};

