import {
  applyReaction,
  applyRsvp,
  applyVote,
  type ChatMessage,
  type MessageContact,
  type MessageInvite,
  type MessageLocation,
  type MessageImage,
  type MessagePoll,
  type MessageReaction,
  type MessageStatus,
  type RsvpAnswer,
} from "@cavulsqa/m3e-vue";
import { teammateAnswer, teammateVote } from "@/modules/gallery/composables/chatTeam";

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
  name: string,
): MessageReaction[] {
  const at = Date.now();
  const list = [...(reactions ?? [])];
  const index = list.findIndex((reaction) => reaction.emoji === emoji);
  const existing = list[index];
  if (existing)
    list[index] = {
      ...existing,
      count: (existing.count ?? 1) + 1,
      by: [...(existing.by ?? []), name],
      at,
    };
  else list.push({ emoji, count: 1, by: [name], at });
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
      {
        ...text(null, "s4", now - DAY + 2 * MINUTE),
        reactions: [{ emoji: "🔥", count: 2, by: [AMINA, KARIM] }],
      },
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
          reactions: joinReaction(entry.reactions, emoji, author!),
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

  type Outgoing = Omit<ChatMessage, "id" | "sent" | "at" | "status">;

  /** Posts without a reply: the team answers a poll or an invite instead of writing back. */
  function postQuietly(message: Outgoing) {
    const next: ChatMessage = {
      ...message,
      id: id(),
      sent: true,
      at: Date.now(),
      status: "sending",
    };
    messages.value = [...messages.value, next];
    deliver(next.id);
    return next.id;
  }

  function post(message: Outgoing) {
    postQuietly(message);
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

  function sendLocation(location: MessageLocation) {
    post({ location });
  }

  function sendContact(contact: MessageContact) {
    post({ contact });
  }

  /** A poll the team answers: one vote soon, another a little later. */
  function sendPoll(poll: MessagePoll) {
    const next = postQuietly({ poll });
    later(1800, () => update(next, (entry) => withPoll(entry, (value) => teammateVote(value, 0))));
    later(3400, () => update(next, (entry) => withPoll(entry, (value) => teammateVote(value, 1))));
  }

  /** An invite the team answers: one is going, one may come. */
  function sendInvite(invite: MessageInvite) {
    const next = postQuietly({ invite });
    later(1800, () =>
      update(next, (entry) => withInvite(entry, (value) => teammateAnswer(value, "going"))),
    );
    later(3400, () =>
      update(next, (entry) => withInvite(entry, (value) => teammateAnswer(value, "maybe"))),
    );
  }

  function vote(message: ChatMessage, optionId: string) {
    update(message.id, (entry) => withPoll(entry, (value) => applyVote(value, optionId)));
  }

  function rsvp(message: ChatMessage, answer: RsvpAnswer) {
    update(message.id, (entry) => withInvite(entry, (value) => applyRsvp(value, answer)));
  }

  function withPoll(message: ChatMessage, change: (poll: MessagePoll) => MessagePoll): ChatMessage {
    return message.poll ? { ...message, poll: change(message.poll) } : message;
  }

  function withInvite(
    message: ChatMessage,
    change: (invite: MessageInvite) => MessageInvite,
  ): ChatMessage {
    return message.invite ? { ...message, invite: change(message.invite) } : message;
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
    sendLocation,
    sendContact,
    sendPoll,
    sendInvite,
    vote,
    rsvp,
    react,
    retry,
    remove,
    loadOlder,
  };
}
