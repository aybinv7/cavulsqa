import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vite-plus/test";
import {
  M3Messages,
  applyRsvp,
  applyVote,
  createM3e,
  pollVotes,
  type ChatMessage,
  type MessageInvite,
  type MessagePoll,
} from "../src/index.js";

const plugins = [createM3e({ reducedMotion: true })];

const poll: MessagePoll = {
  question: "Depot meeting?",
  options: [
    { id: "mon", label: "Monday", votes: 2 },
    { id: "tue", label: "Tuesday", votes: 1 },
  ],
};

describe("applyVote", () => {
  test("a vote counts, and in a single-answer poll a new one moves it", () => {
    const first = applyVote(poll, "mon");
    expect(first.options.map((option) => [option.votes, option.mine])).toEqual([
      [3, true],
      [1, undefined],
    ]);
    const moved = applyVote(first, "tue");
    expect(moved.options.map((option) => [option.votes, option.mine])).toEqual([
      [2, false],
      [2, true],
    ]);
    expect(pollVotes(moved)).toBe(4);
  });

  test("tapping your own vote takes it back; a multiple-answer poll keeps both", () => {
    expect(applyVote(applyVote(poll, "mon"), "mon").options[0]).toMatchObject({
      votes: 2,
      mine: false,
    });
    const both = applyVote(applyVote({ ...poll, multiple: true }, "mon"), "tue");
    expect(both.options.map((option) => option.mine)).toEqual([true, true]);
  });
});

describe("applyRsvp", () => {
  const invite: MessageInvite = {
    title: "Stock count",
    start: new Date(2026, 9, 9, 8, 0),
    answers: { going: 1, maybe: 0, no: 0 },
  };

  test("an answer counts, a different one moves it, the same one takes it back", () => {
    const going = applyRsvp(invite, "going");
    expect(going).toMatchObject({ mine: "going", answers: { going: 2, maybe: 0, no: 0 } });
    const maybe = applyRsvp(going, "maybe");
    expect(maybe).toMatchObject({ mine: "maybe", answers: { going: 1, maybe: 1, no: 0 } });
    expect(applyRsvp(maybe, "maybe")).toMatchObject({
      mine: undefined,
      answers: { going: 1, maybe: 0, no: 0 },
    });
  });
});

describe("message cards", () => {
  const messages: ChatMessage[] = [
    {
      id: 1,
      sent: true,
      at: Date.now(),
      location: { lat: 35.69739, lng: -0.63309, label: "Oran depot" },
    },
    {
      id: 2,
      sent: false,
      author: "Amina",
      at: Date.now(),
      contact: { name: "Oran Market", detail: "Oran" },
    },
    { id: 3, sent: true, at: Date.now(), poll },
    {
      id: 4,
      sent: false,
      author: "Karim",
      at: Date.now(),
      invite: {
        title: "Stock count",
        start: new Date(2026, 9, 9, 8, 0),
        place: "Depot",
        answers: { going: 1, maybe: 0, no: 0 },
      },
    },
  ];

  test("each card renders and reports what was tapped", async () => {
    const wrapper = mount(M3Messages, {
      props: { messages, label: "Team", locale: "en" },
      global: { plugins },
    });
    const location = wrapper.get(".m3-chat-location");
    expect(location.text()).toContain("Oran depot");
    expect(location.text()).toContain("35.69739, -0.63309");
    await location.trigger("click");
    await wrapper.get(".m3-chat-contact").trigger("click");
    expect(wrapper.emitted("press")?.map(([message]) => (message as ChatMessage).id)).toEqual([
      1, 2,
    ]);

    const options = wrapper.findAll(".m3-chat-poll__option");
    expect(options[0]!.text()).toContain("67%");
    expect(options[0]!.attributes("role")).toBe("radio");
    await options[1]!.trigger("click");
    expect(wrapper.emitted("vote")?.[0]?.[1]).toBe("tue");

    const invite = wrapper.get(".m3-chat-invite");
    expect(invite.text()).toContain("Stock count");
    expect(invite.text()).toContain("Depot");
    await invite.findAll(".m3-chat-invite__answer")[1]!.trigger("click");
    expect(wrapper.emitted("rsvp")?.[0]?.[1]).toBe("maybe");
    expect(wrapper.emitted("hold")).toBeUndefined();

    for (const selector of [
      ".m3-chat-location__title > span",
      ".m3-chat-contact__name > span",
      ".m3-chat-poll__question > span",
      ".m3-chat-poll__label > span",
      ".m3-chat-invite__title > span",
    ])
      expect(wrapper.get(selector).attributes("dir")).toBe("auto");
    wrapper.unmount();
  });

  test("labels can be replaced, and a card is never drawn as jumbo emoji", () => {
    const wrapper = mount(M3Messages, {
      props: {
        messages: [{ id: 9, sent: true, at: Date.now(), text: "👍", poll }],
        label: "Team",
        cardLabels: { pollSingle: "Un seul choix", votes: (count: number) => `${count} voix` },
      },
      global: { plugins },
    });
    expect(wrapper.get(".m3-chat-poll__hint").text()).toBe("Un seul choix");
    expect(wrapper.get(".m3-chat-poll__total").text()).toBe("3 voix");
    expect(wrapper.find(".m3-chat-bubble--jumbo").exists()).toBe(false);
    wrapper.unmount();
  });
});
