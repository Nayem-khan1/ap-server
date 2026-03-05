import { Router } from "express";
import { adminAuthRouter } from "../modules/auth/auth.route";
import { dashboardRouter } from "../modules/dashboard/route";
import { usersRouter } from "../modules/user/route";
import { courseRouter, instructorRouter } from "../modules/course/route";
import {
  learningFlowRouter,
  lessonContentRouter,
  lessonRouter,
  quizRouter,
  smartNoteRouter,
} from "../modules/lesson/route";
import { enrollmentRouter, progressRouter } from "../modules/enrollment/route";
import { paymentRouter } from "../modules/payment/route";
import { couponRouter } from "../modules/coupon/route";
import { certificateRouter } from "../modules/certificate/route";
import { blogRouter } from "../modules/blog/route";
import { eventRouter } from "../modules/event/route";
import { settingsRouter } from "../modules/settings/route";
import { analyticsRouter } from "../modules/analytics/route";
import { requireAuth } from "../middlewares/auth.middleware";

const adminRouter = Router();

adminRouter.use("/auth", adminAuthRouter);
adminRouter.use(requireAuth(["super_admin", "admin", "instructor"]));
adminRouter.use("/dashboard", dashboardRouter);
adminRouter.use("/users", usersRouter);
adminRouter.use("/courses", courseRouter);
adminRouter.use("/instructors", instructorRouter);
adminRouter.use("/lessons", lessonRouter);
adminRouter.use("/lesson-contents", lessonContentRouter);
adminRouter.use("/learning-flow", learningFlowRouter);
adminRouter.use("/quiz", quizRouter);
adminRouter.use("/smart-notes", smartNoteRouter);
adminRouter.use("/enrollments", enrollmentRouter);
adminRouter.use("/progress", progressRouter);
adminRouter.use("/payments", paymentRouter);
adminRouter.use("/coupons", couponRouter);
adminRouter.use("/certificates", certificateRouter);
adminRouter.use("/blog", blogRouter);
adminRouter.use("/events", eventRouter);
adminRouter.use("/settings", settingsRouter);
adminRouter.use("/analytics", analyticsRouter);

export { adminRouter };
