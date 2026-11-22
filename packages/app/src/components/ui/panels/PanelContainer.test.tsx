// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import PanelLayout from "@components/ui/panels/PanelLayout";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<PanelLayout />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const panelArea = () => container.querySelector<HTMLElement>(".h-full.w-full")!;
const menu = () => container.querySelector<HTMLElement>("ul");

function dispatchMouse(
  target: HTMLElement,
  type: "click" | "contextmenu",
  x: number,
  y: number,
) {
  act(() => {
    target.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
      }),
    );
  });
}

describe("PanelContainer menu", () => {
  it("opens at the point of a right click", () => {
    dispatchMouse(panelArea(), "contextmenu", 120, 80);

    expect(menu()?.style.left).toBe("120px");
    expect(menu()?.style.top).toBe("80px");
  });

  it("moves to the point of a new right click", () => {
    dispatchMouse(panelArea(), "contextmenu", 120, 80);
    dispatchMouse(panelArea(), "contextmenu", 200, 150);

    expect(menu()?.style.left).toBe("200px");
    expect(menu()?.style.top).toBe("150px");
  });

  it("does not open with a left click", () => {
    dispatchMouse(panelArea(), "click", 120, 80);

    expect(menu()).toBeNull();
  });
});
