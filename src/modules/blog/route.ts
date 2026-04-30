import { Router } from "express";
import { validateObjectId } from "../../middlewares/validate-object-id.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { blogController } from "./controller";
import { blogValidation } from "./schema";

const blogRouter = Router();
const objectIdPath = ":id([0-9a-fA-F]{24})";

blogRouter.get("/authors", blogController.listAuthors);
blogRouter.post(
  "/authors",
  validateRequest(blogValidation.createAuthor),
  blogController.createAuthor,
);
blogRouter.patch(
  `/authors/${objectIdPath}`,
  validateObjectId("id"),
  validateRequest(blogValidation.updateAuthor),
  blogController.updateAuthor,
);
blogRouter.put(
  `/authors/${objectIdPath}`,
  validateObjectId("id"),
  validateRequest(blogValidation.updateAuthor),
  blogController.updateAuthor,
);
blogRouter.delete(
  `/authors/${objectIdPath}`,
  validateObjectId("id"),
  blogController.deleteAuthor,
);
blogRouter.delete(
  "/authors",
  validateRequest(blogValidation.bulkDeleteAuthors),
  blogController.bulkDeleteAuthors,
);

blogRouter.get("/categories", blogController.listCategories);
blogRouter.post(
  "/categories",
  validateRequest(blogValidation.createCategory),
  blogController.createCategory,
);
blogRouter.patch(
  `/categories/${objectIdPath}`,
  validateObjectId("id"),
  validateRequest(blogValidation.updateCategory),
  blogController.updateCategory,
);
blogRouter.put(
  `/categories/${objectIdPath}`,
  validateObjectId("id"),
  validateRequest(blogValidation.updateCategory),
  blogController.updateCategory,
);
blogRouter.delete(
  "/categories",
  validateRequest(blogValidation.bulkDeleteCategories),
  blogController.bulkDeleteCategories,
);
blogRouter.get("/", blogController.listBlogs);
blogRouter.get(`/${objectIdPath}`, validateObjectId("id"), blogController.getBlogById);
blogRouter.post("/", validateRequest(blogValidation.create), blogController.createBlog);
blogRouter.patch(
  `/${objectIdPath}`,
  validateObjectId("id"),
  validateRequest(blogValidation.update),
  blogController.updateBlog,
);
blogRouter.put(
  `/${objectIdPath}`,
  validateObjectId("id"),
  validateRequest(blogValidation.update),
  blogController.updateBlog,
);
blogRouter.delete(`/${objectIdPath}`, validateObjectId("id"), blogController.deleteBlog);
blogRouter.patch(
  `/${objectIdPath}/status`,
  validateObjectId("id"),
  validateRequest(blogValidation.updateStatus),
  blogController.setPublishStatus,
);
blogRouter.delete("/", validateRequest(blogValidation.bulkDelete), blogController.bulkDelete);

export { blogRouter };
