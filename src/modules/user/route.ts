import { Router } from "express";
import { validateObjectId } from "../../middlewares/validate-object-id.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { userController } from "./controller";
import { userValidation } from "./schema";

const usersRouter = Router();

usersRouter.get("/", validateRequest(userValidation.listUsers), userController.listUsers);
usersRouter.get("/students", validateRequest(userValidation.listUsers), userController.listStudents);
usersRouter.get(
  "/students/:id",
  validateObjectId("id"),
  validateRequest(userValidation.userId),
  userController.getStudentById,
);
usersRouter.get(
  "/students/:id/enrollments",
  validateObjectId("id"),
  validateRequest(userValidation.userId),
  userController.getStudentEnrollments,
);
usersRouter.get(
  "/students/:id/payments",
  validateObjectId("id"),
  validateRequest(userValidation.userId),
  userController.getStudentPayments,
);
usersRouter.get(
  "/students/:id/progress",
  validateObjectId("id"),
  validateRequest(userValidation.userId),
  userController.getStudentProgress,
);

usersRouter.get("/admins", validateRequest(userValidation.listUsers), userController.listAdmins);
usersRouter.post("/admins", validateRequest(userValidation.createAdmin), userController.createAdmin);
usersRouter.patch(
  "/admins/:id",
  validateObjectId("id"),
  validateRequest(userValidation.updateAdmin),
  userController.updateAdmin,
);
usersRouter.delete("/admins", validateRequest(userValidation.bulkDelete), userController.bulkDeleteAdmins);
usersRouter.get(
  "/:id",
  validateObjectId("id"),
  validateRequest(userValidation.userId),
  userController.getStudentById,
);

const instructorsRouter = Router();
instructorsRouter.get("/", userController.listInstructors);
instructorsRouter.post("/", validateRequest(userValidation.createInstructor), userController.createInstructor);
instructorsRouter.patch(
  "/:id",
  validateObjectId("id"),
  validateRequest(userValidation.updateInstructor),
  userController.updateInstructor,
);
instructorsRouter.delete("/:id", validateObjectId("id"), userController.deleteInstructor);

export { usersRouter, instructorsRouter };
