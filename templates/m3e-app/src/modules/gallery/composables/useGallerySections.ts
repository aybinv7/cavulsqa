import type { MaterialShapeName } from "@cavulsqa/m3e";
import { defineAsyncComponent, type Component } from "vue";
import AnimationIcon from "~icons/material-symbols/animation-rounded";
import CheckIcon from "~icons/material-symbols/check-rounded";
import EditIcon from "~icons/material-symbols/edit-outline-rounded";
import InventoryIcon from "~icons/material-symbols/inventory-2-outline-rounded";
import AddIcon from "~icons/material-symbols/add-rounded";
import MenuIcon from "~icons/material-symbols/menu-rounded";
import ShapesIcon from "~icons/material-symbols/shapes-outline-rounded";
import WidgetsIcon from "~icons/material-symbols/widgets-outline-rounded";
import TuneIcon from "~icons/material-symbols/tune-rounded";
import CalendarIcon from "~icons/material-symbols/calendar-today-outline-rounded";
import SpeedIcon from "~icons/material-symbols/speed-rounded";
import type { Tone } from "@/shared/utils/tone";

export interface GallerySection {
  id: string;
  icon: Component;
  shape: MaterialShapeName;
  tone: Tone;
  titleKey: string;
  subtitleKey: string;
  /** Loaded only when the section opens, so the gallery index stays light. */
  component: Component;
}

const section = (
  id: string,
  icon: Component,
  shape: MaterialShapeName,
  tone: Tone,
  load: () => Promise<{ default: Component }>,
): GallerySection => ({
  id,
  icon,
  shape,
  tone,
  titleKey: `gallery.sections.${id}.title`,
  subtitleKey: `gallery.sections.${id}.subtitle`,
  component: defineAsyncComponent(load),
});

/** One page per component family, each demonstrating its variants against the spec. */
export const sections: readonly GallerySection[] = [
  section(
    "buttons",
    WidgetsIcon,
    "cookie9Sided",
    "primary",
    () => import("../components/sections/GalleryButtons.vue"),
  ),
  section(
    "fabs",
    AddIcon,
    "cookie4Sided",
    "tertiary",
    () => import("../components/sections/GalleryFabs.vue"),
  ),
  section(
    "progress",
    AnimationIcon,
    "softBurst",
    "secondary",
    () => import("../components/sections/GalleryProgress.vue"),
  ),
  section(
    "shapes",
    ShapesIcon,
    "flower",
    "primary",
    () => import("../components/sections/GalleryShapes.vue"),
  ),
  section(
    "navigation",
    MenuIcon,
    "pill",
    "secondary",
    () => import("../components/sections/GalleryNavigation.vue"),
  ),
  section(
    "overlays",
    InventoryIcon,
    "clover4Leaf",
    "tertiary",
    () => import("../components/sections/GalleryOverlays.vue"),
  ),
  section(
    "selection",
    CheckIcon,
    "sunny",
    "primary",
    () => import("../components/sections/GallerySelection.vue"),
  ),
  section(
    "pickers",
    CalendarIcon,
    "cookie12Sided",
    "tertiary",
    () => import("../components/sections/GalleryPickers.vue"),
  ),
  section(
    "scale",
    SpeedIcon,
    "softBurst",
    "secondary",
    () => import("../components/sections/GalleryScale.vue"),
  ),
  section(
    "inputs",
    EditIcon,
    "gem",
    "secondary",
    () => import("../components/sections/GalleryInputs.vue"),
  ),
  section(
    "surfaces",
    TuneIcon,
    "pentagon",
    "tertiary",
    () => import("../components/sections/GallerySurfaces.vue"),
  ),
];

export function findSection(id: string): GallerySection | undefined {
  return sections.find((entry) => entry.id === id);
}
