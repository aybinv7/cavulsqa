export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export interface MessageImage {
  src: string;
  width: number;
  height: number;
  alt?: string;
}

export interface ChatMessage {
  id: string | number;
  /** True for the device owner's own messages, drawn at the end edge. */
  sent: boolean;
  at: Date | string | number;
  text?: string;
  author?: string;
  avatar?: string;
  status?: MessageStatus;
  image?: MessageImage;
}

export interface DayRow {
  kind: "day";
  key: string;
  label: string;
}

export interface MessageRow {
  kind: "message";
  key: string | number;
  message: ChatMessage;
  first: boolean;
  last: boolean;
  time: string;
  /** The newest of the owner's messages, the one that carries the delivery status. */
  latestSent: boolean;
}

export type ConversationRow = DayRow | MessageRow;

export interface RowOptions {
  locale?: string;
  /** Consecutive messages from one author closer than this, in ms, share a group. */
  groupWindow?: number;
  now?: Date;
}

const DAY = 86_400_000;
const formatters = new Map<string, Intl.DateTimeFormat>();
const relatives = new Map<string, Intl.RelativeTimeFormat>();

function formatter(locale: string | undefined, options: Intl.DateTimeFormatOptions) {
  const key = `${locale ?? ""}|${JSON.stringify(options)}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, cached);
  }
  return cached;
}

function relative(locale: string | undefined) {
  const key = locale ?? "";
  let cached = relatives.get(key);
  if (!cached) {
    cached = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    relatives.set(key, cached);
  }
  return cached;
}

export function toDate(value: Date | string | number): Date {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function capitalise(text: string, locale: string | undefined): string {
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

/** "Today", "Yesterday", the weekday within the week, then the date - with the year once it differs. */
export function dayLabel(date: Date, now: Date, locale?: string): string {
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY);
  if (days === 0 || days === 1)
    return capitalise(relative(locale).format(days === 0 ? 0 : -1, "day"), locale);
  if (days > 1 && days < 7)
    return capitalise(formatter(locale, { weekday: "long" }).format(date), locale);
  const year = date.getFullYear() === now.getFullYear() ? undefined : "numeric";
  return capitalise(
    formatter(locale, { weekday: "short", day: "numeric", month: "long", year }).format(date),
    locale,
  );
}

export function timeLabel(date: Date, locale?: string): string {
  return formatter(locale, { hour: "numeric", minute: "2-digit" }).format(date);
}

/**
 * The conversation as rows to render: a day divider wherever the date changes, and each message
 * marked first and last of its group - consecutive messages from one author within `groupWindow`
 * on the same day - so the bubbles can tighten the corners they share.
 */
export function conversationRows(
  messages: readonly ChatMessage[],
  options: RowOptions = {},
): ConversationRow[] {
  const { locale, groupWindow = 5 * 60_000, now = new Date() } = options;
  const rows: ConversationRow[] = [];
  const dates = messages.map((message) => toDate(message.at));
  let latestSent = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]!.sent) {
      latestSent = index;
      break;
    }
  }

  const together = (a: number, b: number) => {
    const left = messages[a];
    const right = messages[b];
    if (!left || !right) return false;
    return (
      left.sent === right.sent &&
      left.author === right.author &&
      startOfDay(dates[a]!) === startOfDay(dates[b]!) &&
      Math.abs(dates[b]!.getTime() - dates[a]!.getTime()) < groupWindow
    );
  };

  messages.forEach((message, index) => {
    const date = dates[index]!;
    const day = startOfDay(date);
    if (index === 0 || startOfDay(dates[index - 1]!) !== day) {
      rows.push({ kind: "day", key: `day-${day}`, label: dayLabel(date, now, locale) });
    }
    rows.push({
      kind: "message",
      key: message.id,
      message,
      first: !together(index - 1, index),
      last: !together(index, index + 1),
      time: timeLabel(date, locale),
      latestSent: index === latestSent,
    });
  });
  return rows;
}

const PICTOGRAPH = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator})/u;
let graphemes: Intl.Segmenter | null | undefined;

/** One to three emoji and nothing else - drawn large and without a bubble, as messaging apps do. */
export function isJumboEmoji(text: string | undefined): boolean {
  const trimmed = text?.trim();
  if (!trimmed || trimmed.length > 48) return false;
  if (graphemes === undefined) {
    graphemes =
      typeof Intl.Segmenter === "function"
        ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
        : null;
  }
  if (!graphemes) return false;
  let count = 0;
  for (const { segment } of graphemes.segment(trimmed)) {
    if (/^\s+$/u.test(segment)) continue;
    if (!PICTOGRAPH.test(segment) || ++count > 3) return false;
  }
  return count > 0;
}

/** Up to two initials, from the first and last words. */
export function initials(name: string | undefined): string {
  const words = (name ?? "").trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) return "";
  const lead = (word: string) => String.fromCodePoint(word.codePointAt(0) ?? 32).trim();
  const first = lead(words[0]!);
  const last = words.length > 1 ? lead(words[words.length - 1]!) : "";
  return (first + last).toLocaleUpperCase();
}

/** A stable pick from `count` options for a name, so one person keeps one colour. */
export function hashPick(name: string | undefined, count: number): number {
  let hash = 0;
  for (const char of name ?? "") hash = (hash * 31 + char.codePointAt(0)!) | 0;
  return Math.abs(hash) % Math.max(1, count);
}
