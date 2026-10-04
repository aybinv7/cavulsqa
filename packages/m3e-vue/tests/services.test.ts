import { expect, test, vi } from "vite-plus/test";
import { createOverlayStack } from "../src/services/overlayStack.js";
import { createSnackbarQueue, SNACKBAR_DURATION } from "../src/services/snackbar.js";
import { createDialogService } from "../src/services/dialog.js";
import { createActionSheetService } from "../src/services/actionSheet.js";

test("snackbars show one at a time, in order", async () => {
  const queue = createSnackbarQueue();
  const first = queue.show("Saved");
  const second = queue.show({ message: "Deleted", action: "Undo" });
  expect(queue.current.value?.message).toBe("Saved");
  queue.settle("timeout");
  await expect(first).resolves.toBe("timeout");
  expect(queue.current.value?.message).toBe("Deleted");
  queue.settle("action");
  await expect(second).resolves.toBe("action");
  expect(queue.current.value).toBeNull();
});

test("a snackbar with an action waits for it unless told otherwise", () => {
  const queue = createSnackbarQueue();
  void queue.show({ message: "Archived", action: "Undo" });
  expect(queue.current.value?.durationMs).toBe(SNACKBAR_DURATION.indefinite);
  expect(queue.current.value?.closable).toBe(true);
  queue.clear();
  void queue.show({ message: "Copied" });
  expect(queue.current.value?.durationMs).toBe(SNACKBAR_DURATION.short);
  expect(queue.current.value?.closable).toBe(false);
});

test("clearing settles everything as dismissed", async () => {
  const queue = createSnackbarQueue();
  const a = queue.show("a");
  const b = queue.show("b");
  queue.clear();
  await expect(a).resolves.toBe("dismissed");
  await expect(b).resolves.toBe("dismissed");
});

test("dialogs queue and resolve true or false, never reject", async () => {
  const service = createDialogService();
  const first = service.confirm({ headline: "Delete?", confirmLabel: "Delete" });
  const second = service.confirm({ headline: "Leave?", confirmLabel: "Leave" });
  expect(service.current.value?.headline).toBe("Delete?");
  service.settle(true);
  await expect(first).resolves.toBe(true);
  expect(service.current.value?.headline).toBe("Leave?");
  service.settle(false);
  await expect(second).resolves.toBe(false);
});

test("opening an action sheet dismisses the one already open", async () => {
  const service = createActionSheetService();
  const first = service.open({ groups: [] });
  const second = service.open({ groups: [{ items: [{ id: "share", label: "Share" }] }] });
  await expect(first).resolves.toBeNull();
  service.settle("share");
  await expect(second).resolves.toBe("share");
});

test("the overlay stack closes only the topmost overlay", () => {
  const stack = createOverlayStack();
  const closeA = vi.fn();
  const closeB = vi.fn();
  const removeA = stack.push({ id: "a", close: closeA, dismissible: () => true });
  stack.push({ id: "b", close: closeB, dismissible: () => true });
  expect(stack.isTop("b")).toBe(true);
  expect(stack.closeTop()).toBe(true);
  expect(closeB).toHaveBeenCalledOnce();
  expect(closeA).not.toHaveBeenCalled();
  removeA();
  expect(stack.entries.value.map((e) => e.id)).toEqual(["b"]);
});

test("a persistent overlay swallows back without closing", () => {
  const stack = createOverlayStack();
  const close = vi.fn();
  stack.push({ id: "decision", close, dismissible: () => false });
  expect(stack.closeTop()).toBe(true);
  expect(close).not.toHaveBeenCalled();
});

test("an empty stack lets back through", () => {
  expect(createOverlayStack().closeTop()).toBe(false);
});

test("Escape closes the top overlay while any is open", () => {
  const stack = createOverlayStack();
  const close = vi.fn();
  const remove = stack.push({ id: "sheet", close, dismissible: () => true });
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  expect(close).toHaveBeenCalledOnce();
  remove();
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  expect(close).toHaveBeenCalledOnce();
});
