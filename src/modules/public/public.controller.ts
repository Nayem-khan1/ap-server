import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../utils/catch-async";
import { sendResponse } from "../../utils/send-response";
import { publicService } from "./public.service";

function extractLang(req: Request): "bn" | "en" {
  return req.query.lang === "bn" ? "bn" : "en";
}

export const publicController = {
  listCourseCategories: catchAsync(async (req: Request, res: Response) => {
    const data = await publicService.listCourseCategories(req.query as any);

    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Course categories fetched successfully",
      data,
    });
  }),

  listCourses: catchAsync(async (req: Request, res: Response) => {
    const data = await publicService.listCourses(req.query as any);

    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Courses fetched successfully",
      data,
    });
  }),

  getCourseBySlug: catchAsync(async (req: Request, res: Response) => {
    const data = await publicService.getCourseBySlug(req.params.slug, extractLang(req));

    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Course fetched successfully",
      data,
    });
  }),

  previewCoursePricing: catchAsync(async (req: Request, res: Response) => {
    const data = await publicService.previewCoursePricing(
      req.params.courseId,
      req.body,
    );

    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Course pricing preview generated successfully",
      data,
    });
  }),

  listBlogs: catchAsync(async (req: Request, res: Response) => {
    const data = await publicService.listBlogs(req.query as any);

    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Blogs fetched successfully",
      data,
    });
  }),

  listBlogCategories: catchAsync(async (_req: Request, res: Response) => {
    const data = await publicService.listBlogCategories();

    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Blog categories fetched successfully",
      data,
    });
  }),

  listAuthors: catchAsync(async (_req: Request, res: Response) => {
    const data = await publicService.listAuthors();

    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Blog authors fetched successfully",
      data,
    });
  }),

  getBlogBySlug: catchAsync(async (req: Request, res: Response) => {
    const data = await publicService.getBlogBySlug(req.params.slug, extractLang(req));

    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Blog fetched successfully",
      data,
    });
  }),

  listEvents: catchAsync(async (req: Request, res: Response) => {
    const data = await publicService.listEvents(req.query as any);

    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Events fetched successfully",
      data,
    });
  }),

  listInstructors: catchAsync(async (req: Request, res: Response) => {
    const data = await publicService.listInstructors(req.query as any);

    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Instructors fetched successfully",
      data,
    });
  }),

  listTestimonials: catchAsync(async (req: Request, res: Response) => {
    const data = await publicService.listTestimonials(req.query as any);

    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Testimonials fetched successfully",
      data,
    });
  }),

  getEventBySlug: catchAsync(async (req: Request, res: Response) => {
    const data = await publicService.getEventBySlug(req.params.slug, extractLang(req));

    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: "Event fetched successfully",
      data,
    });
  }),

  verifyCertificate: catchAsync(async (req: Request, res: Response) => {
    const certificateNo = String(req.query.certificate_no ?? "");
    const data = await publicService.verifyCertificate(certificateNo);
    return sendResponse({
      res,
      statusCode: StatusCodes.OK,
      success: true,
      message: data ? "Certificate verified" : "Certificate not found",
      data,
    });
  }),
};
