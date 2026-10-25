import { describe, expect, it } from "vitest";
import { add } from "./index";

describe("add", () => {
  it("somma due numeri", () => {
    expect(add(2, 3)).toBe(5);
  });
});
