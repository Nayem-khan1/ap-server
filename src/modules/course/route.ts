import { Router } from "express";
import { validateObjectId } from "../../middlewares/validate-object-id.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { courseController } from "./controller";
import { courseValidation } from "./schema";
import { userController } from "../user/controller";
import { userValidation } from "../user/schema";

const courseRouter = Router();

courseRouter.get("/", validateRequest(courseValidation.list), courseController.listCourses);
courseRouter.post("/", validateRequest(courseValidation.create), courseController.createCourse);
courseRouter.patch(
  "/:id",
  validateObjectId("id"),
  validateRequest(courseValidation.update),
  courseController.updateCourse,
);
courseRouter.patch(
  "/:id/status",
  validateObjectId("id"),
  validateRequest(courseValidation.updateStatus),
  courseController.setCoursePublishStatus,
);
courseRouter.delete("/", validateRequest(courseValidation.bulkDelete), courseController.bulkDeleteCourses);

courseRouter.get("/categories", courseController.listCategories);
courseRouter.post(
  "/categories",
  validateRequest(courseValidation.createCategory),
  courseController.createCategory,
);
courseRouter.patch(
  "/categories/:id",
  validateObjectId("id"),
  validateRequest(courseValidation.updateCategory),
  courseController.updateCategory,
);
courseRouter.patch(
  "/categories/:id/status",
  validateObjectId("id"),
  validateRequest(courseValidation.updateCategoryStatus),
  courseController.setCategoryPublishStatus,
);
courseRouter.delete(
  "/categories",
  validateRequest(courseValidation.bulkDelete),
  courseController.bulkDeleteCategories,
);

courseRouter.get(
  "/:id",
  validateObjectId("id"),
  validateRequest(courseValidation.byId),
  courseController.getCourseById,
);

courseRouter.get(
  "/:courseId/modules",
  validateObjectId("courseId"),
  validateRequest(courseValidation.listModulesByCourse),
  courseController.listModulesByCourse,
);
courseRouter.post(
  "/modules",
  validateRequest(courseValidation.createModule),
  courseController.createModule,
);
courseRouter.patch(
  "/modules/:moduleId",
  validateObjectId("moduleId"),
  validateRequest(courseValidation.updateModule),
  courseController.updateModule,
);
courseRouter.delete("/modules/:moduleId", validateObjectId("moduleId"), courseController.deleteModule);

const instructorRouter = Router();
instructorRouter.get("/", userController.listInstructors);
instructorRouter.post("/", validateRequest(userValidation.createInstructor), userController.createInstructor);
instructorRouter.patch(
  "/:id",
  validateObjectId("id"),
  validateRequest(userValidation.updateInstructor),
  userController.updateInstructor,
);
instructorRouter.delete("/:id", validateObjectId("id"), userController.deleteInstructor);

export { courseRouter, instructorRouter };
