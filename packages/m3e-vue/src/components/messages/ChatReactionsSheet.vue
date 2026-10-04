<script setup lang="ts">
import ChatAvatar from "./ChatAvatar.vue";
import M3BottomSheet from "../sheet/M3BottomSheet.vue";
import M3Chip from "../chip/M3Chip.vue";
import M3List from "../list/M3List.vue";
import M3ListItem from "../list/M3ListItem.vue";
import { computed, shallowRef, watch } from "vue";
import { reactionPeople, reactionTotal, type ChatMessage } from "../../utils/messages.js";

/**
 * Who reacted to a message, as WhatsApp lists it: a chip per emoji with its count (and one for all),
 * then the people - the owner first, whose row takes their reaction off, then everyone the message
 * names, then the rest of a count it does not.
 */
const props = defineProps<{
  message: ChatMessage | null;
  title: string;
  allLabel: string;
  youLabel: string;
  removeLabel: string;
  othersLabel: (count: number) => string;
}>();

const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ remove: [message: ChatMessage] }>();

const filter = shallowRef<string | null>(null);
watch(open, (value) => {
  if (value) filter.value = null;
});

const reactions = computed(() => props.message?.reactions ?? []);
const total = computed(() => reactionTotal(reactions.value));
const people = computed(() =>
  reactionPeople(reactions.value).filter(
    (person) => filter.value === null || person.emoji === filter.value,
  ),
);

function remove() {
  const message = props.message;
  if (!message) return;
  open.value = false;
  emit("remove", message);
}
</script>

<template>
  <M3BottomSheet v-model:open="open" :title="props.title" :label="props.title">
    <div class="m3-chat-reactions-sheet">
      <div class="m3-chat-reactions-sheet__filters" role="group" :aria-label="props.title">
        <M3Chip
          kind="filter"
          :label="`${props.allLabel} ${total}`"
          :selected="filter === null"
          @update:selected="filter = null"
        />
        <M3Chip
          v-for="reaction in reactions"
          :key="reaction.emoji"
          kind="filter"
          :label="`${reaction.emoji} ${Math.max(1, reaction.count ?? 1)}`"
          :selected="filter === reaction.emoji"
          @update:selected="filter = filter === reaction.emoji ? null : reaction.emoji"
        />
      </div>
      <M3List :label="props.title">
        <M3ListItem
          v-for="(person, index) in people"
          :key="`${person.emoji}:${person.name ?? (person.mine ? 'mine' : 'others')}:${index}`"
          :clickable="person.mine"
          :headline="
            person.mine ? props.youLabel : (person.name ?? props.othersLabel(person.others ?? 1))
          "
          :supporting="person.mine ? props.removeLabel : undefined"
          @click="person.mine && remove()"
        >
          <template #leading>
            <ChatAvatar :name="person.mine ? props.youLabel : person.name" />
          </template>
          <template #trailing>
            <span class="m3-chat-reactions-sheet__emoji" aria-hidden="true">{{
              person.emoji
            }}</span>
          </template>
        </M3ListItem>
      </M3List>
    </div>
  </M3BottomSheet>
</template>

<style scoped>
.m3-chat-reactions-sheet {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 16px;
}

.m3-chat-reactions-sheet__filters {
  display: flex;
  gap: 8px;
  padding: 0 16px 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.m3-chat-reactions-sheet__emoji {
  font-size: 22px;
  line-height: 1;
}
</style>
