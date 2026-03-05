import { Router } from "express";
import { validateRequest } from "../../middlewares/validate-request.middleware";
import { publicController } from "./public.controller";
import { publicValidation } from "./public.validation";

const router = Router();

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

router.get(
  "/blogs",
  validateRequest(publicValidation.listBlogs),
  publicController.listBlogs,
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
