import type { Component } from "vue";

export interface ChoiceOption<V extends string> {
  value: V;
  label: string;
  icon?: Component;
}
