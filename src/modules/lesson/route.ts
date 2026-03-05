import { Router } from "express";
import { validateObjectId } from "../../middlewares/validate-object-id.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { lessonController } from "./controller";
import { lessonValidation } from "./schema";

const lessonRouter = Router();
lessonRouter.get("/", lessonController.listLessons);
lessonRouter.get(
  "/:id",
  validateObjectId("id"),
  validateRequest(lessonValidation.byId),
  lessonController.getLessonById,
);
lessonRouter.post("/", validateRequest(lessonValidation.create), lessonController.createLesson);
lessonRouter.patch(
  "/:id",
  validateObjectId("id"),
  validateRequest(lessonValidation.update),
  lessonController.updateLesson,
);
lessonRouter.patch(
  "/:id/status",
  validateObjectId("id"),
  validateRequest(lessonValidation.updateStatus),
  lessonController.setLessonPublishStatus,
);
lessonRouter.delete("/", validateRequest(lessonValidation.bulkDelete), lessonController.bulkDeleteLessons);

const lessonContentRouter = Router();
lessonContentRouter.get(
  "/:lessonId",
  validateObjectId("lessonId"),
  validateRequest(lessonValidation.byLesson),
  lessonController.listLessonContents,
);
lessonContentRouter.post(
  "/",
  validateRequest(lessonValidation.lessonContentCreate),
  lessonController.createLessonContent,
);
lessonContentRouter.patch(
  "/:contentId",
  validateObjectId("contentId"),
  validateRequest(lessonValidation.lessonContentUpdate),
  lessonController.updateLessonContent,
);
lessonContentRouter.delete("/:contentId", validateObjectId("contentId"), lessonController.deleteLessonContent);
lessonContentRouter.post(
  "/reorder",
  validateRequest(lessonValidation.lessonContentReorder),
  lessonController.reorderLessonContents,
);

const learningFlowRouter = Router();
learningFlowRouter.get(
  "/lessons/:lessonId/steps",
  validateObjectId("lessonId"),
  validateRequest(lessonValidation.byLesson),
  lessonController.learningFlowByLesson,
);
learningFlowRouter.post(
  "/lessons/:lessonId/reorder",
  validateObjectId("lessonId"),
  validateRequest(lessonValidation.learningFlowSave),
  lessonController.saveLearningFlow,
);

const quizRouter = Router();
quizRouter.get("/", lessonController.listQuizSteps);
quizRouter.post("/", validateRequest(lessonValidation.quizCreate), lessonController.createQuizStep);
quizRouter.patch(
  "/:id",
  validateObjectId("id"),
  validateRequest(lessonValidation.quizUpdate),
  lessonController.updateQuizStep,
);
quizRouter.patch(
  "/:id/status",
  validateObjectId("id"),
  validateRequest(lessonValidation.updateStatus),
  lessonController.setQuizPublishStatus,
);
quizRouter.delete("/", validateRequest(lessonValidation.bulkDelete), lessonController.bulkDeleteQuizSteps);

const smartNoteRouter = Router();
smartNoteRouter.get("/", lessonController.listSmartNoteSteps);
smartNoteRouter.post(
  "/",
  validateRequest(lessonValidation.smartNoteCreate),
  lessonController.createSmartNoteStep,
);
smartNoteRouter.patch(
  "/:id",
  validateObjectId("id"),
  validateRequest(lessonValidation.smartNoteUpdate),
  lessonController.updateSmartNoteStep,
);
smartNoteRouter.patch(
  "/:id/status",
  validateObjectId("id"),
  validateRequest(lessonValidation.updateStatus),
  lessonController.setSmartNotePublishStatus,
);
smartNoteRouter.delete(
  "/",
  validateRequest(lessonValidation.bulkDelete),
  lessonController.bulkDeleteSmartNoteSteps,
);

export {
  lessonRouter,
  lessonContentRouter,
  learningFlowRouter,
  quizRouter,
  smartNoteRouter,
};
