import { expect, test } from "vite-plus/test";
import {
  formatMobile,
  isMobile,
  mobileDigits,
  passwordScore,
} from "../src/modules/gallery/composables/fieldFormats.js";

test("a password scores by length and by the kinds of character in it", () => {
  expect(passwordScore("abc")).toBe(0);
  expect(passwordScore("abcdefgh")).toBe(1);
  expect(passwordScore("abcdefghijklmn")).toBe(1);
  expect(passwordScore("Abcdefg1")).toBe(3);
  expect(passwordScore("Abcdefgh1!xyz")).toBe(4);
});

test("a mobile number reads the same however its prefix was typed", () => {
  expect(mobileDigits("0555 12 34 56")).toBe("555123456");
  expect(mobileDigits("+213 555-123-456")).toBe("555123456");
  expect(mobileDigits("5551234567")).toBe("555123456");
  expect(formatMobile("555123456")).toBe("5 55 12 34 56");
  expect(formatMobile("5551")).toBe("5 55 1");
  expect(isMobile("555123456")).toBe(true);
  expect(isMobile("212345678")).toBe(false);
});
