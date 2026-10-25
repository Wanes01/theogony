import { z } from "zod";
import { baseFields, idSchema } from "./common";

export const storySchema = z.object({
  ...baseFields,
  name: z.string().min(1),
  description: z.string().optional(),
  calendarId: idSchema,
  contentLanguage: z.string().optional(),
  schemaVersion: z.number().int().positive(),
});

export type Story = z.infer<typeof storySchema>;
