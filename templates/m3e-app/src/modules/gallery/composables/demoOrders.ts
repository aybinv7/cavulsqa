import { WILAYAS } from "@/modules/gallery/composables/wilayas";

export type OrderStatus = "draft" | "confirmed" | "delivered";

export interface Order {
  ref: string;
  customer: string;
  wilaya: string;
  date: string;
  status: OrderStatus;
  totalCents: number;
}

export const ORDER_COUNTS = [30, 1000, 5000] as const;

const STATUSES: OrderStatus[] = ["draft", "confirmed", "delivered"];
const CUSTOMERS = ["Oran Market", "Blida Gros", "Épicerie Saïd", "Annaba Fresh", "Tlemcen Dist."];

/** `count` orders, the same every time, so the table demo can be measured at any size. */
export function makeOrders(count: number): Order[] {
  return Array.from({ length: count }, (_, index) => ({
    ref: `SO-${1001 + index}`,
    customer: CUSTOMERS[(index * 3) % CUSTOMERS.length]!,
    wilaya: WILAYAS[(index * 11) % WILAYAS.length]!,
    date: `2026-${String(1 + ((index >> 5) % 12)).padStart(2, "0")}-${String(1 + (index % 28)).padStart(2, "0")}`,
    status: STATUSES[(index * 7) % STATUSES.length]!,
    totalCents: ((index * 7919) % 90000) * 100 + 150000,
  }));
}
