declare module "xss-clean" {
  import { RequestHandler } from "express";

  function xss(): RequestHandler;

  export default xss;
}

declare module "express-mongo-sanitize" {
  import { RequestHandler } from "express";

  interface SanitizeOptions {
    replaceWith?: string;
    dryRun?: boolean;
    onSanitize?: (options: { req: unknown; key: string }) => void;
    allowDots?: boolean;
  }

  function mongoSanitize(options?: SanitizeOptions): RequestHandler;

  export default mongoSanitize;
}

declare module "multer" {
  import { RequestHandler } from "express";

  interface MulterFile {
    originalname: string;
    mimetype: string;
    buffer: Buffer;
    size: number;
  }

  interface Multer {
    single(fieldName: string): RequestHandler;
  }

  interface MulterOptions {
    storage?: unknown;
    limits?: {
      fileSize?: number;
    };
  }

  function multer(options?: MulterOptions): Multer;

  namespace multer {
    function memoryStorage(): unknown;
  }

  export default multer;
}

declare namespace Express {
  interface Request {
    file?: {
      originalname: string;
      mimetype: string;
      buffer: Buffer;
      size: number;
    };
  }
}
