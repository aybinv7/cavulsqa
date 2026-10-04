import type { Component } from "vue";
import type { ChatMessage } from "../../utils/messages.js";

/** What the location, contact, poll and event cards say; `M3Messages` has English defaults. */
export interface MessageCardLabels {
  openLocation: string;
  openContact: string;
  pollSingle: string;
  pollMultiple: string;
  votes: (count: number) => string;
  going: string;
  maybe: string;
  no: string;
}

/** An entry in the menu a long-pressed message opens under itself: copy, reply, delete. */
export interface MessageAction {
  id: string;
  label: string;
  icon?: Component;
  tone?: "default" | "destructive";
  /** Leave the action out for messages it does not apply to - copy on a photo, say. */
  when?: (message: ChatMessage) => boolean;
}
