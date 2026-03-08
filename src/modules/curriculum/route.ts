import { Router } from "express";
import { curriculumController } from "./controller";
import { curriculumValidation } from "./schema";
import { validateObjectId } from "../../middlewares/validate-object-id.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";

export const moduleRouter = Router();
export const lessonRouter = Router();
export const contentRouter = Router();

// --- Modules ---
moduleRouter.get(
  "/",
  validateRequest(curriculumValidation.listModules),
  curriculumController.listModules,
);
moduleRouter.post(
  "/",
  validateRequest(curriculumValidation.createModule),
  curriculumController.createModule,
);
moduleRouter.post(
  "/reorder",
  validateRequest(curriculumValidation.reorderModules),
  curriculumController.reorderModules,
);
moduleRouter.patch(
  "/:moduleId",
  validateObjectId("moduleId"),
  validateRequest(curriculumValidation.updateModule),
  curriculumController.updateModule,
);
moduleRouter.delete(
  "/:moduleId",
  validateObjectId("moduleId"),
  curriculumController.deleteModule,
);

// --- Modules -> Lessons ---
moduleRouter.get(
  "/:moduleId/lessons",
  validateObjectId("moduleId"),
  curriculumController.listLessonsByModule,
);
moduleRouter.post(
  "/:moduleId/lessons",
  validateObjectId("moduleId"),
  validateRequest(curriculumValidation.createLesson),
  curriculumController.createLesson,
);

// --- Lessons ---
lessonRouter.get(
  "/",
  validateRequest(curriculumValidation.listLessons),
  curriculumController.listLessons, // For course-wide fetches
);
lessonRouter.post(
  "/reorder",
  validateRequest(curriculumValidation.reorderLessons),
  curriculumController.reorderLessons,
);
lessonRouter.patch(
  "/:lessonId",
  validateObjectId("lessonId"),
  validateRequest(curriculumValidation.updateLesson),
  curriculumController.updateLesson,
);
lessonRouter.delete(
  "/:lessonId",
  validateObjectId("lessonId"),
  curriculumController.deleteLesson,
);

// --- Lessons -> Contents ---
lessonRouter.get(
  "/:lessonId/contents",
  validateObjectId("lessonId"),
  curriculumController.listContentsByLesson,
);
lessonRouter.post(
  "/:lessonId/contents",
  validateObjectId("lessonId"),
  validateRequest(curriculumValidation.createContent),
  curriculumController.createContent,
);

// --- Contents ---
contentRouter.post(
  "/reorder",
  validateRequest(curriculumValidation.reorderContents),
  curriculumController.reorderContents,
);
contentRouter.patch(
  "/:contentId",
  validateObjectId("contentId"),
  validateRequest(curriculumValidation.updateContent),
  curriculumController.updateContent,
);
contentRouter.delete(
  "/:contentId",
  validateObjectId("contentId"),
  curriculumController.deleteContent,
);
