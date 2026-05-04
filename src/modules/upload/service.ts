import path from "path";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/app-error";
import { env } from "../../config/env";
import { cloudinary } from "../../utils/cloudinary";
import { logger } from "../../config/logger";

interface UploadFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

function hasCloudinaryCredentials(): boolean {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET,
  );
}

function canUseMockUploads(): boolean {
  return !env.IS_PRODUCTION || !env.REQUIRE_EXTERNAL_SERVICES;
}

function toSafeFileName(fileName: string): string {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function createMockUploadUrl(folder: string, fileName: string): string {
  const timestamp = Date.now();
  const safeFile = toSafeFileName(fileName || "asset");
  return `https://mock-upload.local/${folder}/${timestamp}-${safeFile}`;
}

async function uploadViaCloudinary(
  file: UploadFile,
  options: { resourceType: "image" | "raw" | "auto"; folder: string },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: options.resourceType,
        folder: options.folder,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(
            new AppError(
              StatusCodes.BAD_GATEWAY,
              "Failed to upload asset to Cloudinary",
            ),
          );
          return;
        }

        resolve(result.secure_url);
      },
    );

    stream.end(file.buffer);
  });
}

export const uploadService = {
  async uploadImage(file: UploadFile): Promise<{ url: string }> {
    if (!file.mimetype.startsWith("image/")) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Only image files are allowed");
    }

    if (!hasCloudinaryCredentials()) {
      if (!canUseMockUploads()) {
        throw new AppError(
          StatusCodes.SERVICE_UNAVAILABLE,
          "Asset storage is not configured",
        );
      }

      logger.warn("Cloudinary credentials are missing. Returning mock image URL.");
      return { url: createMockUploadUrl("images", file.originalname) };
    }

    const url = await uploadViaCloudinary(file, {
      resourceType: "image",
      folder: "astronomy-pathshala/images",
    });

    return { url };
  },

  async uploadFile(file: UploadFile): Promise<{ url: string }> {
    const extension = path.extname(file.originalname).toLowerCase();
    const supported = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".zip", ".txt"];

    if (extension && !supported.includes(extension)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Unsupported file type. Allowed: pdf, doc, docx, ppt, pptx, zip, txt",
      );
    }

    if (!hasCloudinaryCredentials()) {
      if (!canUseMockUploads()) {
        throw new AppError(
          StatusCodes.SERVICE_UNAVAILABLE,
          "Asset storage is not configured",
        );
      }

      logger.warn("Cloudinary credentials are missing. Returning mock file URL.");
      return { url: createMockUploadUrl("files", file.originalname) };
    }

    const url = await uploadViaCloudinary(file, {
      resourceType: "auto",
      folder: "astronomy-pathshala/files",
    });

    return { url };
  },
};
