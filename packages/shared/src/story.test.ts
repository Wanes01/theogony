import { describe, expect, it } from "vitest";
import { storySchema } from "./story";

const valid = {
  id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  name: "Cronache di Vaelor",
  calendarId: "01ARZ3NDEKTSV4RRFFQ69G5FAW",
  schemaVersion: 1,
  createdAt: 1761350400000,
  updatedAt: 1761350400000,
};

describe("storySchema", () => {
  it("accetta una storia valida", () => {
    expect(storySchema.safeParse(valid).success).toBe(true);
  });

  it("rifiuta una storia senza nome", () => {
    expect(storySchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rifiuta una data non intera", () => {
    expect(storySchema.safeParse({ ...valid, createdAt: 1.5 }).success).toBe(false);
  });
});
