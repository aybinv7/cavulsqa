/** Framework7 page transitions, one per detail route so each push looks different. */
export type PageTransition =
  | "f7-circle"
  | "f7-cover"
  | "f7-cover-v"
  | "f7-dive"
  | "f7-fade"
  | "f7-flip"
  | "f7-parallax"
  | "f7-push";

/** How the detail page's navbar is configured, to show the variants side by side. */
export interface NavbarVariant {
  large: boolean;
  transparent: boolean;
  hideOnScroll: boolean;
  /** Adds a second row under the title, which stays put while the large title collapses. */
  subnavbar: boolean;
}

export interface HomeFeature {
  id: string;
  icon: string;
  /** Framework7 colour name - the palette the theme already ships. */
  color: string;
  titleKey: string;
  subtitleKey: string;
  textKey: string;
  transition: PageTransition;
  navbar: NavbarVariant;
}

const navbar = (
  large: boolean,
  transparent: boolean,
  hideOnScroll: boolean,
  subnavbar = false,
): NavbarVariant => ({ large, transparent, hideOnScroll, subnavbar });

/**
 * Data rather than markup, so removing a layer means removing an entry and the screen cannot keep
 * advertising something the generator left out.
 *
 * Each entry also drives a detail route inside the Home tab's own view. That is the point of the
 * nesting: the push happens within the tab, so the tab bar stays put, the back gesture unwinds only
 * this tab's history, and every other tab keeps the screen it was on.
 */
export const features: HomeFeature[] = [
  {
    id: "tabs",
    icon: "square_grid_2x2_fill",
    color: "blue",
    titleKey: "features.tabs.title",
    subtitleKey: "features.tabs.subtitle",
    textKey: "features.tabs.text",
    transition: "f7-parallax",
    navbar: navbar(true, false, false),
  },
  {
    id: "f7",
    icon: "layers_alt_fill",
    color: "pink",
    titleKey: "features.f7.title",
    subtitleKey: "features.f7.subtitle",
    textKey: "features.f7.text",
    transition: "f7-cover",
    navbar: navbar(true, true, false),
  },
  {
    id: "sqlite",
    icon: "cylinder_split_1x2_fill",
    color: "green",
    titleKey: "features.sqlite.title",
    subtitleKey: "features.sqlite.subtitle",
    textKey: "features.sqlite.text",
    transition: "f7-push",
    navbar: navbar(false, false, true),
  },
  {
    id: "reactive",
    icon: "arrow_2_circlepath",
    color: "teal",
    titleKey: "features.reactive.title",
    subtitleKey: "features.reactive.subtitle",
    textKey: "features.reactive.text",
    transition: "f7-dive",
    navbar: navbar(true, false, false, true),
  },
  {
    id: "back",
    icon: "arrow_uturn_left_circle_fill",
    color: "orange",
    titleKey: "features.back.title",
    subtitleKey: "features.back.subtitle",
    textKey: "features.back.text",
    transition: "f7-flip",
    navbar: navbar(false, false, false),
  },
  {
    id: "keyboard",
    icon: "keyboard",
    color: "purple",
    titleKey: "features.keyboard.title",
    subtitleKey: "features.keyboard.subtitle",
    textKey: "features.keyboard.text",
    transition: "f7-fade",
    navbar: navbar(false, true, false),
  },
  {
    id: "metrics",
    icon: "chart_bar_alt_fill",
    color: "red",
    titleKey: "features.metrics.title",
    subtitleKey: "features.metrics.subtitle",
    textKey: "features.metrics.text",
    transition: "f7-circle",
    navbar: navbar(true, true, true),
  },
  {
    id: "dx",
    icon: "rocket_fill",
    color: "yellow",
    titleKey: "features.dx.title",
    subtitleKey: "features.dx.subtitle",
    textKey: "features.dx.text",
    transition: "f7-cover-v",
    navbar: navbar(true, false, false),
  },
];

export function findFeature(id: string): HomeFeature | undefined {
  return features.find((feature) => feature.id === id);
}
