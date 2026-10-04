import type { MaterialShapeName } from "@cavulsqa/m3e";
import type { Component } from "vue";
import BackIcon from "~icons/material-symbols/arrow-back-rounded";
import BoltIcon from "~icons/material-symbols/bolt-rounded";
import DatabaseIcon from "~icons/material-symbols/database-outline-rounded";
import KeyboardIcon from "~icons/material-symbols/keyboard-outline-rounded";
import MonitoringIcon from "~icons/material-symbols/monitoring-rounded";
import PaletteIcon from "~icons/material-symbols/palette-outline-rounded";
import ShapesIcon from "~icons/material-symbols/shapes-outline-rounded";
import WidgetsIcon from "~icons/material-symbols/widgets-outline-rounded";
import type { Tone } from "@/shared/utils/tone";

/**
 * Framework7's own page transitions, one per feature so each push looks different. They ship in
 * Framework7's core stylesheet, and Framework7 replays the one a page opened with when it goes back.
 */
export type PageTransition =
  | "f7-circle"
  | "f7-cover"
  | "f7-cover-v"
  | "f7-dive"
  | "f7-fade"
  | "f7-flip"
  | "f7-parallax"
  | "f7-push";

export interface HomeFeature {
  id: string;
  icon: Component;
  shape: MaterialShapeName;
  tone: Tone;
  titleKey: string;
  subtitleKey: string;
  textKey: string;
  transition: PageTransition;
}

/**
 * The template's capabilities as data, so removing a layer means removing an entry and the screen
 * never advertises something the generator left out. Each one opens inside the Home tab's own
 * view, which is the nesting being demonstrated: the push stays in this tab's history.
 */
export const features: readonly HomeFeature[] = [
  {
    id: "expressive",
    icon: ShapesIcon,
    shape: "cookie9Sided",
    tone: "primary",
    titleKey: "features.expressive.title",
    subtitleKey: "features.expressive.subtitle",
    textKey: "features.expressive.text",
    transition: "f7-cover",
  },
  {
    id: "color",
    icon: PaletteIcon,
    shape: "clover4Leaf",
    tone: "tertiary",
    titleKey: "features.color.title",
    subtitleKey: "features.color.subtitle",
    textKey: "features.color.text",
    transition: "f7-circle",
  },
  {
    id: "shell",
    icon: WidgetsIcon,
    shape: "pentagon",
    tone: "secondary",
    titleKey: "features.shell.title",
    subtitleKey: "features.shell.subtitle",
    textKey: "features.shell.text",
    transition: "f7-parallax",
  },
  {
    id: "sqlite",
    icon: DatabaseIcon,
    shape: "cookie4Sided",
    tone: "primary",
    titleKey: "features.sqlite.title",
    subtitleKey: "features.sqlite.subtitle",
    textKey: "features.sqlite.text",
    transition: "f7-push",
  },
  {
    id: "reactive",
    icon: BoltIcon,
    shape: "sunny",
    tone: "tertiary",
    titleKey: "features.reactive.title",
    subtitleKey: "features.reactive.subtitle",
    textKey: "features.reactive.text",
    transition: "f7-dive",
  },
  {
    id: "back",
    icon: BackIcon,
    shape: "pill",
    tone: "secondary",
    titleKey: "features.back.title",
    subtitleKey: "features.back.subtitle",
    textKey: "features.back.text",
    transition: "f7-flip",
  },
  {
    id: "keyboard",
    icon: KeyboardIcon,
    shape: "gem",
    tone: "primary",
    titleKey: "features.keyboard.title",
    subtitleKey: "features.keyboard.subtitle",
    textKey: "features.keyboard.text",
    transition: "f7-fade",
  },
  {
    id: "metrics",
    icon: MonitoringIcon,
    shape: "flower",
    tone: "tertiary",
    titleKey: "features.metrics.title",
    subtitleKey: "features.metrics.subtitle",
    textKey: "features.metrics.text",
    transition: "f7-cover-v",
  },
];

export function findFeature(id: string): HomeFeature | undefined {
  return features.find((feature) => feature.id === id);
}
