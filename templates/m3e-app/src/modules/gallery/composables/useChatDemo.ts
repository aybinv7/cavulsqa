import {
  applyReaction,
  type ChatMessage,
  type MessageImage,
  type MessageReaction,
  type MessageStatus,
} from "@cavulsqa/m3e-vue";

const AMINA = "Amina Benali";
const KARIM = "Karim Haddad";
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const OLDER_PAGES = 3;
const PAGE_SIZE = 10;

type Line = [author: string | null, key: string];

const OLDER: readonly Line[] = [
  [AMINA, "o1"],
  [null, "o2"],
  [KARIM, "o3"],
  [AMINA, "o4"],
  [null, "o5"],
];

const TEAM_REACTIONS = ["❤️", "👍", "🔥", "😂"] as const;

function joinReaction(
  reactions: readonly MessageReaction[] | undefined,
  emoji: string,
): MessageReaction[] {
  const at = Date.now();
  const list = [...(reactions ?? [])];
  const index = list.findIndex((reaction) => reaction.emoji === emoji);
  const existing = list[index];
  if (existing) list[index] = { ...existing, count: (existing.count ?? 1) + 1, at };
  else list.push({ emoji, count: 1, at });
  return list;
}

const REPLIES: readonly Line[] = [
  [AMINA, "r1"],
  [KARIM, "r2"],
  [AMINA, "r3"],
  [KARIM, "r4"],
];

/**
 * A team conversation that behaves like a live one without a server: history pages in from above,
 * a sent message walks through sending, sent and delivered, a teammate types and answers, and the
 * answer marks what you sent as read - and they react to it, springing onto the bubble. Every timer is
 * cleared with the page.
 */
export function useChatDemo(photo: (index: number) => MessageImage | null) {
  const { t } = useI18n();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const messages = shallowRef<ChatMessage[]>([]);
  const typing = shallowRef<{ author: string } | false>(false);
  const draft = ref("");
  let sequence = 0;
  let pages = 0;
  let replies = 0;
  let attached = 0;

  const id = () => `m${(sequence += 1)}`;

  function later(ms: number, run: () => void) {
    const timer = setTimeout(() => {
      timers.delete(timer);
      run();
    }, ms);
    timers.add(timer);
  }

  function text(author: string | null, key: string, at: number): ChatMessage {
    return author
      ? { id: id(), sent: false, author, at, text: t(`gallery.chat.lines.${key}`) }
      : { id: id(), sent: true, at, text: t(`gallery.chat.lines.${key}`), status: "read" };
  }

  function seed() {
    const now = Date.now();
    const today = new Date(now).setHours(9, 12, 0, 0);
    const morning = Math.min(today, now - 2 * HOUR);
    const image = photo(1);
    messages.value = [
      text(AMINA, "s1", now - 2 * DAY),
      text(null, "s2", now - 2 * DAY + 4 * MINUTE),
      text(AMINA, "s3", now - DAY),
      { ...text(null, "s4", now - DAY + 2 * MINUTE), reactions: [{ emoji: "🔥", count: 2 }] },
      text(null, "s5", now - DAY + 3 * MINUTE),
      { id: id(), sent: false, author: AMINA, at: now - DAY + 5 * MINUTE, text: "👏" },
      {
        id: id(),
        sent: false,
        author: KARIM,
        at: morning,
        text: t("gallery.chat.lines.s6"),
        ...(image ? { image } : {}),
      },
      {
        ...text(AMINA, "s7", morning + 3 * MINUTE),
        reactions: [{ emoji: "👍", mine: true }],
      },
      text(null, "s8", morning + 6 * MINUTE),
      { ...text(null, "s9", morning + 7 * MINUTE), status: "failed" },
    ];
  }

  function update(target: string | number, change: (message: ChatMessage) => ChatMessage) {
    messages.value = messages.value.map((message) =>
      message.id === target ? change(message) : message,
    );
  }

  function react(message: ChatMessage, emoji: string | null) {
    update(message.id, (entry) => ({ ...entry, reactions: applyReaction(entry.reactions, emoji) }));
  }

  function setStatus(target: string | number, status: MessageStatus) {
    update(target, (message) => ({ ...message, status }));
  }

  function deliver(target: string | number) {
    later(700, () => setStatus(target, "sent"));
    later(1600, () => setStatus(target, "delivered"));
  }

  function reply() {
    const [author, key] = REPLIES[replies % REPLIES.length]!;
    replies += 1;
    later(2200, () => (typing.value = { author: author! }));
    later(4600, () => {
      typing.value = false;
      const lastSent = messages.value.findLast((message) => message.sent);
      if (lastSent && replies % 2 === 1) {
        const emoji = TEAM_REACTIONS[(replies >> 1) % TEAM_REACTIONS.length]!;
        update(lastSent.id, (entry) => ({
          ...entry,
          reactions: joinReaction(entry.reactions, emoji),
        }));
      }
      messages.value = [
        ...messages.value.map((message) =>
          message.sent && message.status === "delivered"
            ? { ...message, status: "read" as const }
            : message,
        ),
        text(author, key, Date.now()),
      ];
    });
  }

  function post(message: Omit<ChatMessage, "id" | "sent" | "at" | "status">) {
    const next: ChatMessage = {
      ...message,
      id: id(),
      sent: true,
      at: Date.now(),
      status: "sending",
    };
    messages.value = [...messages.value, next];
    deliver(next.id);
    reply();
  }

  function send(value: string) {
    post({ text: value });
  }

  function sendPhoto(index?: number) {
    attached += 1;
    const image = photo(index ?? attached * 2);
    if (image) post({ image });
  }

  function sendImage(image: MessageImage) {
    post({ image });
  }

  function retry(message: ChatMessage) {
    setStatus(message.id, "sending");
    deliver(message.id);
  }

  function remove(message: ChatMessage) {
    messages.value = messages.value.filter((entry) => entry.id !== message.id);
  }

  async function loadOlder(): Promise<boolean> {
    if (pages >= OLDER_PAGES) return false;
    await new Promise<void>((resolve) => later(700, resolve));
    pages += 1;
    const oldest = messages.value[0] ? new Date(messages.value[0].at).getTime() : Date.now();
    const page = Array.from({ length: PAGE_SIZE }, (_, index) => {
      const [author, key] = OLDER[(index + pages) % OLDER.length]!;
      return text(author, key, oldest - DAY - (PAGE_SIZE - index) * 3 * MINUTE);
    });
    messages.value = [...page, ...messages.value];
    return pages < OLDER_PAGES;
  }

  onMounted(seed);
  onScopeDispose(() => {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
  });

  return {
    messages,
    typing,
    draft,
    send,
    sendPhoto,
    sendImage,
    react,
    retry,
    remove,
    loadOlder,
  };
}
