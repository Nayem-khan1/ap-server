import { z } from "zod";

export const dashboardValidation = {
  analyticsQuery: {
    query: z.object({}),
  },
};

