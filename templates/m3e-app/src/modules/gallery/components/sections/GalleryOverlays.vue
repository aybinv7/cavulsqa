<template>
  <GalleryBlock :title="t('gallery.overlays.sheet')" :note="t('gallery.overlays.sheetNote')">
    <M3Button variant="tonal" @click="sheetOpen = true">{{
      t("gallery.overlays.openSheet")
    }}</M3Button>
    <M3Button variant="outlined" @click="openActions">{{
      t("gallery.overlays.openActions")
    }}</M3Button>
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.overlays.standard')" :note="t('gallery.overlays.standardNote')">
    <M3Button variant="tonal" @click="toggleStandard">{{
      standardDetent === "hidden"
        ? t("gallery.overlays.showStandard")
        : t("gallery.overlays.hideStandard")
    }}</M3Button>
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.overlays.side')" :note="t('gallery.overlays.sideNote')">
    <M3Button variant="tonal" @click="sideOpen = true">{{
      t("gallery.overlays.openSide")
    }}</M3Button>
    <M3Button variant="outlined" @click="railOpen = true">
      <template #icon><i-ms-menu-rounded /></template>
      {{ t("gallery.overlays.openRail") }}
    </M3Button>
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.overlays.tooltips')" :note="t('gallery.overlays.tooltipsNote')">
    <M3Tooltip :text="t('gallery.buttons.share')">
      <M3IconButton :label="t('gallery.buttons.share')" variant="tonal"
        ><i-ms-share-outline-rounded
      /></M3IconButton>
    </M3Tooltip>
    <M3Tooltip rich :title="t('gallery.overlays.richTitle')" :text="t('gallery.overlays.richText')">
      <M3Button variant="text">
        <template #icon><i-ms-info-outline-rounded /></template>
        {{ t("gallery.overlays.whatsThis") }}
      </M3Button>
      <template #actions="{ close }">
        <M3Button variant="text" size="xs" @click="close">{{
          t("gallery.overlays.gotIt")
        }}</M3Button>
      </template>
    </M3Tooltip>
  </GalleryBlock>

  <GalleryBlock
    :title="t('gallery.overlays.fullscreen')"
    :note="t('gallery.overlays.fullscreenNote')"
  >
    <M3Button variant="tonal" @click="formOpen = true">{{
      t("gallery.overlays.newCustomer")
    }}</M3Button>
  </GalleryBlock>

  <GalleryCustomerForm
    v-model:open="formOpen"
    @saved="(name) => snackbar.show(t('gallery.overlays.customerSaved', { name }))"
  />

  <GalleryBlock :title="t('gallery.overlays.dialog')" :note="t('gallery.overlays.dialogNote')">
    <M3Button variant="tonal" @click="confirm">{{ t("gallery.overlays.openDialog") }}</M3Button>
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.overlays.menu')" :note="t('gallery.overlays.menuNote')">
    <div ref="menuAnchor" class="inline-flex">
      <M3Button variant="outlined" @click="menuOpen = !menuOpen">
        {{ t("gallery.overlays.sortBy", { order: t(`gallery.overlays.orders.${sort}`) }) }}
        <template #trailing><i-ms-sort-rounded /></template>
      </M3Button>
    </div>
    <M3Menu v-model:open="menuOpen" :anchor="menuAnchor" :label="t('gallery.overlays.menu')">
      <M3MenuGroup :label="t('gallery.overlays.sort')">
        <M3MenuItem
          v-for="order in ORDERS"
          :key="order"
          checkable
          :selected="sort === order"
          :label="t(`gallery.overlays.orders.${order}`)"
          @select="sort = order"
        />
      </M3MenuGroup>
      <M3MenuGroup>
        <M3MenuItem
          :label="t('gallery.overlays.groupBy')"
          :supporting="t(`gallery.overlays.groups.${groupBy}`)"
        >
          <template #icon><i-ms-category-outline-rounded /></template>
          <template #submenu>
            <M3MenuItem
              v-for="group in GROUPS"
              :key="group"
              checkable
              :selected="groupBy === group"
              :label="t(`gallery.overlays.groups.${group}`)"
              @select="groupBy = group"
            />
          </template>
        </M3MenuItem>
        <M3MenuItem
          :label="t('gallery.overlays.reset')"
          tone="destructive"
          @select="sort = 'recent'"
        >
          <template #icon><i-ms-restart-alt-rounded /></template>
        </M3MenuItem>
      </M3MenuGroup>
    </M3Menu>
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.overlays.popover')" :note="t('gallery.overlays.popoverNote')">
    <div ref="popoverAnchor" class="inline-flex">
      <M3Button variant="tonal" :aria-expanded="popoverOpen" @click="popoverOpen = !popoverOpen">
        {{ t("gallery.overlays.cases", { n: cases }) }}
        <template #trailing><i-ms-expand-more-rounded /></template>
      </M3Button>
    </div>
    <M3Popover
      v-model:open="popoverOpen"
      :anchor="popoverAnchor"
      :label="t('gallery.overlays.quantity')"
    >
      <template #default="{ close }">
        <div class="flex flex-col gap-3 p-4">
          <span class="type-title-small text-on-surface">{{ t("gallery.overlays.quantity") }}</span>
          <M3Stepper
            v-model="cases"
            :label="t('gallery.overlays.quantity')"
            :min="1"
            :max="48"
            :decrement-label="t('gallery.selection.decrease')"
            :increment-label="t('gallery.selection.increase')"
          />
          <span class="type-body-small text-on-surface-variant">{{
            t("gallery.overlays.quantityNote")
          }}</span>
          <M3Button variant="text" class="self-end" @click="close">{{
            t("gallery.overlays.done")
          }}</M3Button>
        </div>
      </template>
    </M3Popover>
  </GalleryBlock>

  <GalleryBlock
    :title="t('gallery.overlays.notification')"
    :note="t('gallery.overlays.notificationNote')"
  >
    <M3Button variant="tonal" @click="notifyOrder">{{
      t("gallery.overlays.notifyOrder")
    }}</M3Button>
    <M3Button variant="outlined" @click="notifySync">{{
      t("gallery.overlays.notifySync")
    }}</M3Button>
  </GalleryBlock>

  <GalleryBlock :title="t('gallery.overlays.snackbar')" :note="t('gallery.overlays.snackbarNote')">
    <M3Button variant="tonal" @click="archive">{{ t("gallery.overlays.archive") }}</M3Button>
  </GalleryBlock>

  <M3SideSheet
    v-model:open="sideOpen"
    :title="t('gallery.overlays.filters')"
    :close-label="t('shell.dismiss')"
  >
    <div class="flex flex-col gap-4 px-6 pb-6">
      <span class="type-title-small text-on-surface-variant">{{ t("gallery.overlays.sort") }}</span>
      <div class="flex flex-wrap gap-2">
        <M3Chip
          v-for="order in ORDERS"
          :key="order"
          kind="filter"
          :label="t(`gallery.overlays.orders.${order}`)"
          :selected="sort === order"
          @update:selected="sort = order"
        />
      </div>
    </div>
    <template #footer>
      <M3Button class="w-full" @click="sideOpen = false">{{ t("gallery.overlays.done") }}</M3Button>
    </template>
  </M3SideSheet>

  <M3ModalNavigationRail
    v-model:open="railOpen"
    v-model:selected="destination"
    :label="t('gallery.overlays.openRail')"
  >
    <M3NavigationItem
      v-for="item in DESTINATIONS"
      :key="item"
      :value="item"
      :label="t(`gallery.navigation.${item}`)"
    >
      <template #icon="{ selected }">
        <i-ms-star-rounded v-if="selected" />
        <i-ms-star-outline-rounded v-else />
      </template>
    </M3NavigationItem>
  </M3ModalNavigationRail>

  <M3StandardBottomSheet
    v-model:detent="standardDetent"
    :label="t('gallery.overlays.nearby')"
    :title="t('gallery.overlays.nearby')"
    :peek-height="112"
    :expand-label="t('gallery.overlays.expandSheet')"
    :collapse-label="t('gallery.overlays.collapseSheet')"
    hideable
  >
    <M3List variant="segmented" inset>
      <M3ListItem
        v-for="stop in 24"
        :key="stop"
        clickable
        :headline="t('gallery.overlays.stop', { n: stop })"
        :supporting="t('gallery.overlays.stopNote', { minutes: stop * 3 })"
      >
        <template #leading><i-ms-location-on-outline-rounded /></template>
      </M3ListItem>
    </M3List>
  </M3StandardBottomSheet>

  <M3BottomSheet v-model:open="sheetOpen" :title="t('gallery.overlays.sheetTitle')">
    <p class="type-body-medium m-0 px-6 pb-4 text-on-surface-variant">
      {{ t("gallery.overlays.sheetText") }}
    </p>
    <M3List variant="segmented" inset>
      <M3ListItem
        v-for="line in 12"
        :key="line"
        :headline="t('gallery.overlays.row', { n: line })"
      />
    </M3List>
    <template #footer>
      <M3Button class="w-full" size="m" @click="sheetOpen = false">{{
        t("gallery.overlays.done")
      }}</M3Button>
    </template>
  </M3BottomSheet>
</template>

<script setup lang="ts">
import type { SheetDetent } from "@cavulsqa/m3e-vue";
import { markRaw } from "vue";
import CloudDoneIcon from "~icons/material-symbols/cloud-done-outline-rounded";
import ContentCopyIcon from "~icons/material-symbols/content-copy-outline-rounded";
import ShoppingIcon from "~icons/material-symbols/shopping-bag-outline-rounded";
import DeleteIcon from "~icons/material-symbols/delete-outline-rounded";
import EditIcon from "~icons/material-symbols/edit-outline-rounded";
import ShareIcon from "~icons/material-symbols/share-outline-rounded";
import StarIcon from "~icons/material-symbols/star-outline-rounded";
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";
import GalleryCustomerForm from "@/modules/gallery/components/GalleryCustomerForm.vue";

const { t } = useI18n();
const snackbar = useSnackbar();
const dialog = useDialog();
const actionSheet = useActionSheet();
const notification = useNotification();

const ORDERS = ["recent", "name", "amount"] as const;
const DESTINATIONS = ["inbox", "starred", "saved"] as const;
const GROUPS = ["none", "customer", "status"] as const;
const sideOpen = ref(false);
const railOpen = ref(false);
const destination = ref<string>("inbox");
const sheetOpen = ref(false);
const formOpen = ref(false);
const standardDetent = ref<SheetDetent>("hidden");
const menuOpen = ref(false);
const sort = ref<(typeof ORDERS)[number]>("recent");
const groupBy = ref<(typeof GROUPS)[number]>("none");
const menuAnchor = useTemplateRef<HTMLElement>("menuAnchor");
const popoverOpen = ref(false);
const cases = ref(6);
const popoverAnchor = useTemplateRef<HTMLElement>("popoverAnchor");

function toggleStandard() {
  standardDetent.value = standardDetent.value === "hidden" ? "peek" : "hidden";
}

async function notifyOrder() {
  const result = await notification.show({
    source: t("gallery.overlays.ordersSource"),
    meta: t("gallery.overlays.now"),
    title: t("gallery.overlays.orderTitle"),
    text: t("gallery.overlays.orderText"),
    icon: markRaw(ShoppingIcon),
  });
  if (result === "opened") void snackbar.show(t("gallery.overlays.orderOpened"));
}

function notifySync() {
  void notification.show({
    source: t("gallery.overlays.syncSource"),
    meta: t("gallery.overlays.now"),
    title: t("gallery.overlays.syncTitle"),
    icon: markRaw(CloudDoneIcon),
    duration: 3000,
  });
}

async function openActions() {
  const choice = await actionSheet.open({
    title: t("gallery.overlays.actionsTitle"),
    supporting: t("gallery.overlays.actionsText"),
    quickActions: [
      { id: "share", label: t("gallery.buttons.share"), icon: markRaw(ShareIcon) },
      { id: "copy", label: t("gallery.overlays.copy"), icon: markRaw(ContentCopyIcon) },
      { id: "star", label: t("gallery.buttons.star"), icon: markRaw(StarIcon) },
    ],
    groups: [
      { items: [{ id: "edit", label: t("gallery.buttons.edit"), icon: markRaw(EditIcon) }] },
      {
        items: [
          {
            id: "delete",
            label: t("gallery.overlays.delete"),
            supporting: t("gallery.overlays.deleteNote"),
            icon: markRaw(DeleteIcon),
            tone: "destructive",
          },
        ],
      },
    ],
  });
  if (choice) void snackbar.show(t("gallery.overlays.chose", { choice }));
}

async function confirm() {
  const confirmed = await dialog.confirm({
    headline: t("gallery.overlays.dialogTitle"),
    text: t("gallery.overlays.dialogText"),
    confirmLabel: t("gallery.overlays.delete"),
    dismissLabel: t("gallery.overlays.cancel"),
    icon: markRaw(DeleteIcon),
    destructive: true,
  });
  void snackbar.show(confirmed ? t("gallery.overlays.deleted") : t("gallery.overlays.kept"));
}

async function archive() {
  const result = await snackbar.show({
    message: t("gallery.overlays.archived"),
    action: t("gallery.overlays.undo"),
  });
  if (result === "action") void snackbar.show(t("gallery.overlays.restored"));
}
</script>
