import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/app-error";
import { catchAsync } from "../../utils/catch-async";
import { sendResponse } from "../../utils/send-response";
import { uploadService } from "./service";

interface UploadedFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

function ensureFile(file: UploadedFile | undefined, fieldName: string): UploadedFile {
  if (!file) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `Missing file payload. Use multipart/form-data field "${fieldName}"`,
    );
  }

  return file;
}

export const uploadController = {
  uploadImage: catchAsync(async (req: Request, res: Response) => {
    const file = ensureFile(req.file as UploadedFile | undefined, "image");
    const data = await uploadService.uploadImage(file);

    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Image uploaded successfully",
      data,
    });
  }),

  uploadFile: catchAsync(async (req: Request, res: Response) => {
    const file = ensureFile(req.file as UploadedFile | undefined, "file");
    const data = await uploadService.uploadFile(file);

    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "File uploaded successfully",
      data,
    });
  }),
};
