import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateObjectId } from "../../middlewares/validate-object-id.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { studentController } from "./controller";
import { studentValidation } from "./schema";

const studentRouter = Router();

studentRouter.use(requireAuth(["student"]));

studentRouter.get("/profile", studentController.getProfile);
studentRouter.patch(
  "/profile",
  validateRequest(studentValidation.updateProfile),
  studentController.updateProfile,
);

studentRouter.get(
  "/dashboard",
  validateRequest(studentValidation.localeQuery),
  studentController.getDashboard,
);
studentRouter.get(
  "/courses",
  validateRequest(studentValidation.localeQuery),
  studentController.getCourses,
);
studentRouter.get(
  "/courses/:courseId/roadmap",
  validateObjectId("courseId"),
  validateRequest(studentValidation.courseRoadmap),
  studentController.getCourseRoadmap,
);

studentRouter.post(
  "/courses/:courseId/enroll",
  validateObjectId("courseId"),
  validateRequest(studentValidation.courseIdParam),
  studentController.enrollInCourse,
);

studentRouter.post(
  "/courses/:courseId/complete-next-lesson",
  validateObjectId("courseId"),
  validateRequest(studentValidation.courseIdParam),
  studentController.completeNextLesson,
);

export { studentRouter };

