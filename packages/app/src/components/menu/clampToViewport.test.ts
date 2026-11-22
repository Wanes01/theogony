import { describe, it, expect } from "vitest";
import { clampToViewport } from "./clampToViewport";

const viewport = { width: 1000, height: 600 };
const menu = { width: 160, height: 120 };

describe("clampToViewport", () => {
  it("keeps a point that already fits", () => {
    expect(clampToViewport({ x: 100, y: 50 }, menu, viewport)).toEqual({
      x: 100,
      y: 50,
    });
  });

  it("moves the menu left when it would overflow the right edge", () => {
    expect(clampToViewport({ x: 950, y: 50 }, menu, viewport)).toEqual({
      x: 840,
      y: 50,
    });
  });

  it("moves the menu up when it would overflow the bottom edge", () => {
    expect(clampToViewport({ x: 100, y: 580 }, menu, viewport)).toEqual({
      x: 100,
      y: 480,
    });
  });

  it("never goes past the top-left corner", () => {
    expect(clampToViewport({ x: -10, y: -5 }, menu, viewport)).toEqual({
      x: 0,
      y: 0,
    });
  });
});
