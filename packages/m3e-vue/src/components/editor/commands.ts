import type { GlyphName } from "../icon/glyphs.js";

export type EditorCommand =
  | "bold"
  | "italic"
  | "underline"
  | "strikeThrough"
  | "insertUnorderedList"
  | "insertOrderedList"
  | "link"
  | "removeFormat";

export interface CommandSpec {
  glyph: GlyphName;
  /** Toggles reflect the selection's state and read as pressed. */
  toggle: boolean;
  label: string;
}

export const COMMANDS: Readonly<Record<EditorCommand, CommandSpec>> = {
  bold: { glyph: "formatBold", toggle: true, label: "Bold" },
  italic: { glyph: "formatItalic", toggle: true, label: "Italic" },
  underline: { glyph: "formatUnderlined", toggle: true, label: "Underline" },
  strikeThrough: { glyph: "strikethrough", toggle: true, label: "Strikethrough" },
  insertUnorderedList: { glyph: "listBulleted", toggle: true, label: "Bulleted list" },
  insertOrderedList: { glyph: "listNumbered", toggle: true, label: "Numbered list" },
  link: { glyph: "link", toggle: true, label: "Link" },
  removeFormat: { glyph: "formatClear", toggle: false, label: "Clear formatting" },
};

export const DEFAULT_TOOLBAR: readonly (EditorCommand | "|")[] = [
  "bold",
  "italic",
  "underline",
  "strikeThrough",
  "|",
  "insertUnorderedList",
  "insertOrderedList",
  "|",
  "link",
  "removeFormat",
];
