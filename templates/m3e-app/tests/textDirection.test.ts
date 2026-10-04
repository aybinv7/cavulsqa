import { expect, test } from "vite-plus/test";
import { textDirection } from "../src/shared/utils/textDirection.js";

test("a language reads the way its script is written", () => {
  expect(textDirection("ar")).toBe("rtl");
  expect(textDirection("ar-DZ")).toBe("rtl");
  expect(textDirection("he")).toBe("rtl");
  expect(textDirection("fr")).toBe("ltr");
  expect(textDirection("en-US")).toBe("ltr");
  expect(textDirection("not a locale")).toBe("ltr");
});
