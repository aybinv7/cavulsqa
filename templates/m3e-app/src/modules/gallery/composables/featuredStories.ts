import type { MaterialShapeName } from "@cavulsqa/m3e";
import type { Component } from "vue";
import DistanceIcon from "~icons/material-symbols/distance-outline-rounded";
import DrinkIcon from "~icons/material-symbols/local-drink-outline-rounded";
import EventIcon from "~icons/material-symbols/event-available-outline-rounded";
import InventoryIcon from "~icons/material-symbols/inventory-2-outline-rounded";
import MapIcon from "~icons/material-symbols/map-outline-rounded";
import PinIcon from "~icons/material-symbols/pin-drop-rounded";
import ReceiptIcon from "~icons/material-symbols/receipt-long-outline-rounded";
import RouteIcon from "~icons/material-symbols/route-outline-rounded";
import ScheduleIcon from "~icons/material-symbols/schedule-outline-rounded";
import StoreIcon from "~icons/material-symbols/storefront-outline-rounded";
import WaterIcon from "~icons/material-symbols/water-drop-outline-rounded";
import type { Tone } from "@/shared/utils/tone";

export interface StoryFact {
  id: string;
  icon: Component;
  value: number;
}

export interface FeaturedStory {
  id: string;
  tone: Tone;
  shape: MaterialShapeName;
  icon: Component;
  facts: readonly StoryFact[];
}

/**
 * The cards of the container-transform demo. Each opens `/gallery/featured/<id>/`, and its tone is
 * the colour the card hands to the page as it grows. Icons are imported once here and never made
 * reactive, so they need no `markRaw`.
 */
export const featuredStories: readonly FeaturedStory[] = [
  {
    id: "range",
    tone: "primary",
    shape: "cookie9Sided",
    icon: DrinkIcon,
    facts: [
      { id: "products", icon: InventoryIcon, value: 12 },
      { id: "flavours", icon: WaterIcon, value: 4 },
      { id: "wilayas", icon: MapIcon, value: 9 },
    ],
  },
  {
    id: "stores",
    tone: "tertiary",
    shape: "clover4Leaf",
    icon: StoreIcon,
    facts: [
      { id: "opened", icon: StoreIcon, value: 7 },
      { id: "visits", icon: EventIcon, value: 21 },
      { id: "orders", icon: ReceiptIcon, value: 15 },
    ],
  },
  {
    id: "route",
    tone: "secondary",
    shape: "gem",
    icon: RouteIcon,
    facts: [
      { id: "stops", icon: PinIcon, value: 14 },
      { id: "distance", icon: DistanceIcon, value: 186 },
      { id: "hours", icon: ScheduleIcon, value: 9 },
    ],
  },
];

export function findStory(id: string): FeaturedStory | undefined {
  return featuredStories.find((story) => story.id === id);
}
