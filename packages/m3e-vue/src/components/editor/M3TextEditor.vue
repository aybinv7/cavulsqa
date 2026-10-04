<script setup lang="ts">
import M3Button from "../button/M3Button.vue";
import M3Glyph from "../icon/M3Glyph.vue";
import M3IconButton from "../button/M3IconButton.vue";
import M3Popover from "../popover/M3Popover.vue";
import M3TextField from "../textfield/M3TextField.vue";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";
import { isSafeHref, sanitizeHtml } from "../../utils/sanitizeHtml.js";
import { COMMANDS, DEFAULT_TOOLBAR, type EditorCommand } from "./commands.js";

/**
 * Framework7's text editor: rich text for a delivery note, a visit report, a product description.
 * Bold, italic, underline, strikethrough, lists, links and clear formatting from a toolbar whose
 * buttons read as pressed where the caret is; the platform's own shortcuts work too. `v-model` is
 * HTML, and only ever sanitised HTML - paragraphs, emphasis, lists and `http`, `mailto` or `tel`
 * links; pasted content is cleaned the same way and dropping is refused. Choose `toolbar` from
 * the commands, with `"|"` for a divider.
 *
 * It edits through the browser's own editing commands, which keeps undo, the IME and spell-check
 * native; it is not a document editor, and does no tables, images or collaborative editing.
 */
const props = withDefaults(
  defineProps<{
    label: string;
    placeholder?: string;
    toolbar?: readonly (EditorCommand | "|")[];
    labels?: Partial<Record<EditorCommand, string>>;
    linkLabel?: string;
    applyLabel?: string;
    removeLinkLabel?: string;
    invalidLinkText?: string;
    disabled?: boolean;
    rows?: number;
  }>(),
  {
    toolbar: () => DEFAULT_TOOLBAR,
    labels: () => ({}),
    linkLabel: "Link address",
    applyLabel: "Apply",
    removeLinkLabel: "Remove link",
    invalidLinkText: "Use an http, https, mailto or tel address",
    disabled: false,
    rows: 4,
  },
);

const model = defineModel<string>({ default: "" });

const editor = useTemplateRef<HTMLElement>("editor");
const active = shallowRef<ReadonlySet<EditorCommand>>(new Set());
const empty = shallowRef(true);
const focused = shallowRef(false);
const linkOpen = shallowRef(false);
const linkDraft = shallowRef("");
const linkInvalid = shallowRef(false);
const linkAnchor = shallowRef<HTMLElement | null>(null);
let saved: Range | null = null;
let emitted = "";

const items = computed(() =>
  props.toolbar.map((entry, index) =>
    entry === "|"
      ? { key: `divider-${index}`, divider: true as const }
      : {
          key: entry,
          divider: false as const,
          command: entry,
          spec: COMMANDS[entry],
          label: props.labels[entry] ?? COMMANDS[entry].label,
        },
  ),
);

function within(node: Node | null): boolean {
  return !!node && !!editor.value?.contains(node);
}

function measureEmpty() {
  const element = editor.value;
  empty.value =
    !element || ((element.textContent ?? "").trim() === "" && !element.querySelector("li"));
}

function emitContent() {
  const element = editor.value;
  if (!element) return;
  measureEmpty();
  const html = empty.value ? "" : sanitizeHtml(element.innerHTML);
  if (html === emitted) return;
  emitted = html;
  model.value = html;
}

function render(value: string) {
  const element = editor.value;
  if (!element) return;
  element.innerHTML = sanitizeHtml(value);
  emitted = value;
  measureEmpty();
}

function currentLink(): HTMLAnchorElement | null {
  const node = saved?.startContainer ?? null;
  const element = node instanceof Element ? node : (node?.parentElement ?? null);
  const link = element?.closest("a") ?? null;
  return link && within(link) ? link : null;
}

function refresh() {
  const next = new Set<EditorCommand>();
  for (const item of items.value) {
    if (item.divider || !item.spec.toggle || item.command === "link") continue;
    try {
      if (document.queryCommandState(item.command)) next.add(item.command);
    } catch {
      continue;
    }
  }
  if (currentLink()) next.add("link");
  active.value = next;
}

function onSelectionChange() {
  const selection = document.getSelection();
  if (!selection?.rangeCount || !within(selection.anchorNode)) return;
  saved = selection.getRangeAt(0).cloneRange();
  refresh();
}

function restore() {
  const element = editor.value;
  if (!element) return;
  element.focus({ preventScroll: true });
  if (!saved) return;
  const selection = document.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(saved);
}

function exec(command: EditorCommand) {
  if (props.disabled) return;
  if (command === "link") {
    void openLink();
    return;
  }
  restore();
  document.execCommand(command, false);
  if (command === "removeFormat") document.execCommand("unlink", false);
  emitContent();
  refresh();
}

async function openLink() {
  linkDraft.value = currentLink()?.getAttribute("href") ?? "";
  linkInvalid.value = false;
  linkOpen.value = true;
  await nextTick();
  await nextTick();
  document.querySelector<HTMLInputElement>(".m3-text-editor__link input")?.focus();
}

function normaliseUrl(value: string): string {
  const trimmed = value.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return `mailto:${trimmed}`;
  if (/^\+?[\d\s()-]{6,}$/.test(trimmed)) return `tel:${trimmed.replace(/[\s()-]/g, "")}`;
  return `https://${trimmed}`;
}

function applyLink() {
  const url = normaliseUrl(linkDraft.value);
  if (!linkDraft.value.trim() || !isSafeHref(url)) {
    linkInvalid.value = true;
    return;
  }
  linkOpen.value = false;
  restore();
  const selection = document.getSelection();
  if (selection?.isCollapsed && !currentLink()) {
    const link = document.createElement("a");
    link.href = url;
    link.textContent = linkDraft.value.trim();
    document.execCommand("insertHTML", false, link.outerHTML);
  } else {
    document.execCommand("createLink", false, url);
  }
  emitContent();
  refresh();
}

function removeLink() {
  linkOpen.value = false;
  restore();
  const link = currentLink();
  if (link && document.getSelection()?.isCollapsed) {
    const range = document.createRange();
    range.selectNodeContents(link);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
  }
  document.execCommand("unlink", false);
  emitContent();
  refresh();
}

function onPaste(event: ClipboardEvent) {
  event.preventDefault();
  if (props.disabled) return;
  const html = event.clipboardData?.getData("text/html");
  const text = event.clipboardData?.getData("text/plain") ?? "";
  if (html) document.execCommand("insertHTML", false, sanitizeHtml(html));
  else if (text) document.execCommand("insertText", false, text);
  emitContent();
}

function onFocus() {
  focused.value = true;
  document.execCommand("defaultParagraphSeparator", false, "p");
}

function keepState() {
  active.value = new Set(active.value);
}

function setLinkAnchor(element: unknown) {
  const instance = element as { $el?: HTMLElement } | null;
  linkAnchor.value = instance?.$el ?? null;
}

watch(model, (value) => {
  if (value !== emitted) render(value);
});

onMounted(() => {
  render(model.value);
  document.addEventListener("selectionchange", onSelectionChange);
});

onBeforeUnmount(() => document.removeEventListener("selectionchange", onSelectionChange));
</script>

<template>
  <div
    class="m3-text-editor"
    :class="{ 'm3-text-editor--focused': focused, 'm3-text-editor--disabled': props.disabled }"
  >
    <div
      class="m3-text-editor__toolbar"
      role="toolbar"
      :aria-label="props.label"
      @pointerdown.prevent
    >
      <template v-for="item in items" :key="item.key">
        <span v-if="item.divider" class="m3-text-editor__divider" aria-hidden="true" />
        <M3IconButton
          v-else
          :ref="item.command === 'link' ? setLinkAnchor : undefined"
          size="s"
          :label="item.label"
          :toggle="item.spec.toggle"
          :selected="active.has(item.command)"
          :disabled="props.disabled"
          @update:selected="keepState"
          @click="exec(item.command)"
        >
          <M3Glyph :name="item.spec.glyph" />
        </M3IconButton>
      </template>
    </div>
    <div
      ref="editor"
      class="m3-text-editor__content"
      :class="{ 'm3-text-editor__content--empty': empty }"
      :contenteditable="props.disabled ? 'false' : 'true'"
      role="textbox"
      aria-multiline="true"
      :aria-label="props.label"
      :aria-placeholder="props.placeholder"
      :aria-disabled="props.disabled || undefined"
      :data-placeholder="props.placeholder"
      :style="{ minHeight: `${props.rows * 24 + 24}px` }"
      @input="emitContent"
      @paste="onPaste"
      @dragover.prevent
      @drop.prevent
      @focus="onFocus"
      @blur="focused = false"
    />
    <M3Popover v-model:open="linkOpen" :anchor="linkAnchor" :label="props.linkLabel" align="start">
      <form class="m3-text-editor__link" novalidate @submit.prevent="applyLink">
        <M3TextField
          v-model="linkDraft"
          :label="props.linkLabel"
          :error="linkInvalid ? props.invalidLinkText : undefined"
          type="url"
          inputmode="url"
          autocapitalize="off"
          spellcheck="false"
          enterkeyhint="done"
        />
        <div class="m3-text-editor__link-actions">
          <M3Button v-if="active.has('link')" variant="text" type="button" @click="removeLink">
            {{ props.removeLinkLabel }}
          </M3Button>
          <M3Button variant="tonal" type="submit">{{ props.applyLabel }}</M3Button>
        </div>
      </form>
    </M3Popover>
  </div>
</template>

<style scoped>
.m3-text-editor {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--md-sys-color-outline);
  border-radius: var(--md-sys-shape-corner-medium, 12px);
  background: var(--md-sys-color-surface);
  transition: border-color var(--md-sys-motion-spring-fast-effects-duration)
    var(--md-sys-motion-spring-fast-effects);
}

.m3-text-editor--focused {
  border-color: var(--md-sys-color-primary);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-primary);
}

.m3-text-editor--disabled {
  opacity: 0.38;
}

.m3-text-editor__toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  overflow-x: auto;
  scrollbar-width: none;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container-low);
}

.m3-text-editor__toolbar::-webkit-scrollbar {
  display: none;
}

.m3-text-editor__divider {
  flex: none;
  width: 1px;
  height: 24px;
  margin: 0 4px;
  background: var(--md-sys-color-outline-variant);
}

.m3-text-editor__content {
  position: relative;
  box-sizing: border-box;
  padding: 12px 16px;
  outline: none;
  overflow-wrap: anywhere;
  color: var(--md-sys-color-on-surface);
  caret-color: var(--md-sys-color-primary);
  font: var(--md-sys-typescale-body-large-weight) var(--md-sys-typescale-body-large-size) / 24px
    var(--md-sys-typescale-body-large-font);
}

.m3-text-editor__content--empty::before {
  content: attr(data-placeholder);
  position: absolute;
  inset: 12px 16px auto;
  color: var(--md-sys-color-on-surface-variant);
  pointer-events: none;
}

.m3-text-editor__content :deep(p) {
  margin: 0 0 8px;
}

.m3-text-editor__content :deep(ul),
.m3-text-editor__content :deep(ol) {
  margin: 0 0 8px;
  padding-inline-start: 24px;
}

.m3-text-editor__content :deep(a) {
  color: var(--md-sys-color-primary);
  text-decoration: underline;
}

.m3-text-editor__link {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(320px, calc(100vw - 48px));
  padding: 16px;
}

.m3-text-editor__link-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
