/** 0 to 4: how much a password resists guessing, by its length and the kinds of character in it. */
export function passwordScore(value: string): 0 | 1 | 2 | 3 | 4 {
  if (value.length < 6) return 0;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((kind) => kind.test(value)).length;
  let score = (value.length >= 8 ? 1 : 0) + (value.length >= 12 ? 1 : 0) + Math.max(0, kinds - 1);
  if (kinds === 1) score = Math.min(score, 1);
  return Math.min(4, Math.max(1, score)) as 1 | 2 | 3 | 4;
}

/**
 * The nine national digits of an Algerian mobile number from whatever was typed: spaces and dashes
 * go, and so does a leading 0 or 213 dialling prefix, so "0555 12 34 56" and "+213 555123456" agree.
 */
export function mobileDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("213")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 9);
}

/** The national digits grouped as they are read aloud: "5 55 12 34 56". */
export function formatMobile(digits: string): string {
  const groups = [
    digits.slice(0, 1),
    digits.slice(1, 3),
    digits.slice(3, 5),
    digits.slice(5, 7),
    digits.slice(7, 9),
  ];
  return groups.filter((group) => group.length > 0).join(" ");
}

/** Whether nine national digits make a mobile number: it starts 5, 6 or 7. */
export function isMobile(digits: string): boolean {
  return /^[567]\d{8}$/.test(digits);
}
