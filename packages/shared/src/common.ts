import { z } from "zod";

// ULID o UUIDv7: il formato esatto si decide quando scriviamo il generatore di id.
// Per ora basta una stringa non vuota.
export const idSchema = z.string().min(1);
export type Id = z.infer<typeof idSchema>;

// Campi comuni a ogni oggetto del database (tranne `stories`, che non ha storyId)
export const baseFields = {
  id: idSchema,
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
};
