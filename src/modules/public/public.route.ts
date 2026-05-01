import { Router } from "express";
import { validateObjectId } from "../../middlewares/validate-object-id.middleware";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { publicController } from "./public.controller";
import { publicValidation } from "./public.validation";

const router = Router();

router.get(
  "/course-categories",
  validateRequest(publicValidation.listCourseCategories),
  publicController.listCourseCategories,
);

router.get(
  "/courses/categories",
  validateRequest(publicValidation.listCourseCategories),
  publicController.listCourseCategories,
);

router.get(
  "/courses",
  validateRequest(publicValidation.listCourses),
  publicController.listCourses,
);

router.get(
  "/courses/:slug",
  validateRequest(publicValidation.getCourseBySlug),
  publicController.getCourseBySlug,
);

router.post(
  "/courses/:courseId/pricing",
  validateObjectId("courseId"),
  validateRequest(publicValidation.previewCoursePricing),
  publicController.previewCoursePricing,
);

router.get(
  "/blog-categories",
  validateRequest(publicValidation.listBlogCategories),
  publicController.listBlogCategories,
);

router.get(
  "/blogs",
  validateRequest(publicValidation.listBlogs),
  publicController.listBlogs,
);

router.get(
  "/blogs/categories",
  validateRequest(publicValidation.listBlogCategories),
  publicController.listBlogCategories,
);

router.get(
  "/authors",
  validateRequest(publicValidation.listAuthors),
  publicController.listAuthors,
);

router.get(
  "/blogs/:slug",
  validateRequest(publicValidation.getBlogBySlug),
  publicController.getBlogBySlug,
);

router.get(
  "/events",
  validateRequest(publicValidation.listEvents),
  publicController.listEvents,
);

router.get(
  "/instructors",
  validateRequest(publicValidation.listInstructors),
  publicController.listInstructors,
);

router.get(
  "/testimonials",
  validateRequest(publicValidation.listTestimonials),
  publicController.listTestimonials,
);

router.get(
  "/events/:slug",
  validateRequest(publicValidation.getEventBySlug),
  publicController.getEventBySlug,
);

router.get(
  "/certificates/verify",
  validateRequest(publicValidation.verifyCertificate),
  publicController.verifyCertificate,
);

export const publicRoutes = router;
