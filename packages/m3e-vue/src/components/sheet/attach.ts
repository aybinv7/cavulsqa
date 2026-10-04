import type { MaterialShapeName } from "@cavulsqa/m3e";
import type { Component } from "vue";

/** One way to send something from `M3AttachSheet`. */
export interface AttachOption {
  id: string;
  label: string;
  icon: Component;
  /** The container colour; left out, the options take turns through the three. */
  tone?: "primary" | "secondary" | "tertiary";
  /** The shape behind the icon; left out, each option takes the next of eight. */
  shape?: MaterialShapeName;
}
