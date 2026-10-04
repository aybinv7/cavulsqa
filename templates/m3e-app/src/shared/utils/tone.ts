export type Tone = "primary" | "secondary" | "tertiary";

/** A container and its content colour, for decorative shapes that need a hue but carry no state. */
export const TONE_CLASSES: Readonly<Record<Tone, string>> = {
  primary: "bg-primary-container text-on-primary-container",
  secondary: "bg-secondary-container text-on-secondary-container",
  tertiary: "bg-tertiary-container text-on-tertiary-container",
};
