export interface HomeFeature {
  icon: string;
  /** Framework7 colour name - the palette the theme already ships. */
  color: string;
  titleKey: string;
  subtitleKey: string;
  textKey: string;
}

/**
 * Data rather than markup, so removing a layer means removing an entry and the screen cannot keep
 * advertising something the generator left out.
 */
export const features: HomeFeature[] = [
  {
    icon: "square_grid_2x2_fill",
    color: "blue",
    titleKey: "features.tabs.title",
    subtitleKey: "features.tabs.subtitle",
    textKey: "features.tabs.text",
  },
  {
    icon: "layers_alt_fill",
    color: "pink",
    titleKey: "features.f7.title",
    subtitleKey: "features.f7.subtitle",
    textKey: "features.f7.text",
  },
  {
    icon: "cylinder_split_1x2_fill",
    color: "green",
    titleKey: "features.sqlite.title",
    subtitleKey: "features.sqlite.subtitle",
    textKey: "features.sqlite.text",
  },
  {
    icon: "arrow_2_circlepath",
    color: "teal",
    titleKey: "features.reactive.title",
    subtitleKey: "features.reactive.subtitle",
    textKey: "features.reactive.text",
  },
  {
    icon: "arrow_uturn_left_circle_fill",
    color: "orange",
    titleKey: "features.back.title",
    subtitleKey: "features.back.subtitle",
    textKey: "features.back.text",
  },
  {
    icon: "keyboard",
    color: "purple",
    titleKey: "features.keyboard.title",
    subtitleKey: "features.keyboard.subtitle",
    textKey: "features.keyboard.text",
  },
  {
    icon: "chart_bar_alt_fill",
    color: "red",
    titleKey: "features.metrics.title",
    subtitleKey: "features.metrics.subtitle",
    textKey: "features.metrics.text",
  },
  {
    icon: "rocket_fill",
    color: "yellow",
    titleKey: "features.dx.title",
    subtitleKey: "features.dx.subtitle",
    textKey: "features.dx.text",
  },
];
