import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middlewares/auth.middleware";
import { uploadController } from "./controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});
const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for PDFs
  },
});

const uploadRouter = Router();

uploadRouter.use(requireAuth(["super_admin", "admin", "instructor"]));

uploadRouter.post(
  "/image",
  upload.single("image"),
  uploadController.uploadImage,
);
uploadRouter.post("/file", upload.single("file"), uploadController.uploadFile);
uploadRouter.post("/pdf", uploadPdf.single("file"), uploadController.uploadPdf);

export { uploadRouter };
