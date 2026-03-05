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

const uploadRouter = Router();

uploadRouter.use(requireAuth(["super_admin", "admin", "instructor"]));

uploadRouter.post("/image", upload.single("image"), uploadController.uploadImage);
uploadRouter.post("/file", upload.single("file"), uploadController.uploadFile);

export { uploadRouter };
