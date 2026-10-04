// @vitest-environment happy-dom
import { expect, test, vi } from "vite-plus/test";
import {
  CONTAINER_TRANSITION,
  useContainerTransform,
} from "../src/shared/composables/navigation/useContainerTransform.js";

function rect(left: number, top: number, width: number, height: number) {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
  } as DOMRect;
}

test("a card inside a view opens its page with the container transform, from its own box", () => {
  const view = document.createElement("div");
  view.className = "view";
  const card = document.createElement("div");
  card.className = "m3-card";
  card.style.backgroundColor = "rgb(1, 2, 3)";
  card.style.borderTopLeftRadius = "12px";
  const label = document.createElement("span");
  card.append(label);
  view.append(card);
  document.body.append(view);
  vi.spyOn(view, "getBoundingClientRect").mockReturnValue(rect(0, 0, 360, 800));
  vi.spyOn(card, "getBoundingClientRect").mockReturnValue(rect(16, 200, 328, 80));

  const navigate = vi.fn();
  const { open } = useContainerTransform();
  label.addEventListener("click", (event) => open({ navigate } as never, event, "/x/"));
  label.dispatchEvent(new MouseEvent("click", { bubbles: true }));

  expect(navigate).toHaveBeenCalledWith("/x/", { transition: CONTAINER_TRANSITION });
  const value = (name: string) => view.style.getPropertyValue(`--m3e-ct-${name}`);
  expect([value("top"), value("left"), value("right"), value("bottom")]).toEqual([
    "200px",
    "16px",
    "16px",
    "520px",
  ]);
  expect(value("radius")).toBe("12px");
  expect(value("color")).toBe("rgb(1, 2, 3)");
  view.remove();
});

test("without a view to grow in, it navigates the ordinary way", () => {
  const navigate = vi.fn();
  const { open } = useContainerTransform();
  open({ navigate } as never, document.createElement("div"), "/y/");
  expect(navigate).toHaveBeenCalledWith("/y/");
});
