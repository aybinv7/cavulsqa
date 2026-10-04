import type { Component } from "vue";
import type { ChatMessage } from "../../utils/messages.js";

/** An entry in the menu a long-pressed message opens under itself: copy, reply, delete. */
export interface MessageAction {
  id: string;
  label: string;
  icon?: Component;
  tone?: "default" | "destructive";
  /** Leave the action out for messages it does not apply to - copy on a photo, say. */
  when?: (message: ChatMessage) => boolean;
}
