import { Schema } from "mongoose";

export function applyDefaultJsonTransform(schema: Schema): void {
  schema.set("toJSON", {
    transform: (_doc, ret) => {
      const transformed = ret as Record<string, unknown>;
      transformed.id = String(transformed._id);
      if (transformed.createdAt instanceof Date) {
        transformed.created_at = transformed.createdAt.toISOString();
      }
      if (transformed.updatedAt instanceof Date) {
        transformed.updated_at = transformed.updatedAt.toISOString();
      }
      delete transformed._id;
      delete transformed.__v;
      delete transformed.createdAt;
      delete transformed.updatedAt;
      return transformed;
    },
  });
}
