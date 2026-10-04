import type { MaterialShapeName } from "@cavulsqa/m3e";
import type { Component } from "vue";
import DraftIcon from "~icons/material-symbols/draft-outline-rounded";
import ShippingIcon from "~icons/material-symbols/local-shipping-outline-rounded";
import VerifiedIcon from "~icons/material-symbols/verified-outline-rounded";

export const ORDER_STATUSES = ["draft", "confirmed", "delivered"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface StatusLook {
  labelKey: string;
  icon: Component;
  shape: MaterialShapeName;
  /** Container and content roles; delivered uses the harmonised `success` custom colour. */
  classes: string;
  /** The container role as a text colour, for an SVG shape that fills with `currentColor`. */
  fill: string;
  /** The content role on that container. */
  ink: string;
}

/**
 * How a status reads at a glance: a role pair, a glyph and a shape, so three statuses stay apart for
 * someone who cannot tell the colours apart - the shape and glyph carry it alone.
 */
export const STATUS_LOOK: Readonly<Record<OrderStatus, StatusLook>> = {
  draft: {
    labelKey: "demo.statusDraft",
    icon: DraftIcon,
    shape: "square",
    classes: "bg-surface-container-highest text-on-surface-variant",
    fill: "text-surface-container-highest",
    ink: "text-on-surface-variant",
  },
  confirmed: {
    labelKey: "demo.statusConfirmed",
    icon: ShippingIcon,
    shape: "cookie4Sided",
    classes: "bg-tertiary-container text-on-tertiary-container",
    fill: "text-tertiary-container",
    ink: "text-on-tertiary-container",
  },
  delivered: {
    labelKey: "demo.statusDelivered",
    icon: VerifiedIcon,
    shape: "cookie9Sided",
    classes: "bg-success-container text-on-success-container",
    fill: "text-success-container",
    ink: "text-on-success-container",
  },
};

export function statusLook(status: string): StatusLook {
  return STATUS_LOOK[
    (ORDER_STATUSES as readonly string[]).includes(status) ? (status as OrderStatus) : "draft"
  ];
}

const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

/** Money is integer cents everywhere; this is the only place it becomes a display string. */
export function formatMoney(cents: number): string {
  return formatter.format(cents / 100);
}
