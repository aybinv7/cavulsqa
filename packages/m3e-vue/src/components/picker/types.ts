export type WheelValue = string | number;

export interface WheelOption<V extends WheelValue = WheelValue> {
  value: V;
  label: string;
  disabled?: boolean;
}

export interface WheelColumn<V extends WheelValue = WheelValue> {
  key: string;
  label: string;
  options: readonly WheelOption<V>[];
  /** Share of the row width; columns default to 1. */
  flex?: number;
  align?: "start" | "center" | "end";
  /** Roll over at the ends - hours, minutes, days, months. */
  loop?: boolean;
}
