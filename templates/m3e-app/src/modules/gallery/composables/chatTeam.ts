import type { MessageInvite, MessagePoll, RsvpAnswer } from "@cavulsqa/m3e-vue";

/** A teammate's vote on option `index`: counted, but not the owner's. */
export function teammateVote(poll: MessagePoll, index: number): MessagePoll {
  const target = poll.options[index % Math.max(1, poll.options.length)];
  if (!target) return poll;
  return {
    ...poll,
    options: poll.options.map((option) =>
      option.id === target.id ? { ...option, votes: option.votes + 1 } : option,
    ),
  };
}

/** A teammate's answer to an invite: counted, but not the owner's. */
export function teammateAnswer(invite: MessageInvite, answer: RsvpAnswer): MessageInvite {
  return { ...invite, answers: { ...invite.answers, [answer]: invite.answers[answer] + 1 } };
}
