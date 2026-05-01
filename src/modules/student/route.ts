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
studentRouter.patch(
  "/courses/:courseId/lessons/:lessonId/video-progress",
  validateObjectId("courseId"),
  validateObjectId("lessonId"),
  validateRequest(studentValidation.lessonVideoProgress),
  studentController.updateLessonVideoProgress,
);
studentRouter.post(
  "/courses/:courseId/lessons/:lessonId/submit-quiz",
  validateObjectId("courseId"),
  validateObjectId("lessonId"),
  validateRequest(studentValidation.lessonQuizSubmission),
  studentController.submitLessonQuiz,
);
studentRouter.post(
  "/courses/:courseId/lessons/:lessonId/complete-note",
  validateObjectId("courseId"),
  validateObjectId("lessonId"),
  validateRequest(studentValidation.lessonNoteCompletion),
  studentController.completeLessonNote,
);

studentRouter.post(
  "/courses/:courseId/enroll",
  validateObjectId("courseId"),
  validateRequest(studentValidation.courseEnrollment),
  studentController.enrollInCourse,
);

studentRouter.get(
  "/certificates",
  validateRequest(studentValidation.localeQuery),
  studentController.getCertificates,
);
studentRouter.get(
  "/certificates/:certificateId/download",
  validateObjectId("certificateId"),
  validateRequest(studentValidation.certificateIdParam),
  studentController.downloadCertificate,
);
studentRouter.get("/orders", studentController.getOrders);

studentRouter.post(
  "/courses/:courseId/complete-next-lesson",
  validateObjectId("courseId"),
  validateRequest(studentValidation.courseIdParam),
  studentController.completeNextLesson,
);

export { studentRouter };
