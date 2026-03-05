import { Router } from "express";
import { validateObjectId } from "../../middlewares/validate-object-id.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { blogController } from "./controller";
import { blogValidation } from "./schema";

const blogRouter = Router();
blogRouter.get("/", blogController.listBlogs);
blogRouter.post("/", validateRequest(blogValidation.create), blogController.createBlog);
blogRouter.patch(
  "/:id",
  validateObjectId("id"),
  validateRequest(blogValidation.update),
  blogController.updateBlog,
);
blogRouter.patch(
  "/:id/status",
  validateObjectId("id"),
  validateRequest(blogValidation.updateStatus),
  blogController.setPublishStatus,
);
blogRouter.delete("/", validateRequest(blogValidation.bulkDelete), blogController.bulkDelete);

export { blogRouter };

