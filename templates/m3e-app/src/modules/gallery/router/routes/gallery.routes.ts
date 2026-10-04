import type { Router } from "framework7/types";
import { lazyRoute } from "@/shared/utils/lazyRoute";

const galleryRoutes: Router.RouteParameters[] = [
  {
    name: "gallery",
    path: "/gallery/",
    async: lazyRoute(() => import("@/modules/gallery/views/GalleryView.vue")),
  },
  {
    name: "gallery-tabs",
    path: "/gallery/tabs/",
    async: lazyRoute(() => import("@/modules/gallery/views/GalleryTabsView.vue")),
  },
  {
    name: "gallery-contacts",
    path: "/gallery/contacts/",
    async: lazyRoute(() => import("@/modules/gallery/views/GalleryContactsView.vue")),
  },
  {
    name: "gallery-chat",
    path: "/gallery/chat/",
    async: lazyRoute(() => import("@/modules/gallery/views/GalleryChatView.vue")),
  },
  {
    name: "gallery-onboarding",
    path: "/gallery/onboarding/",
    async: lazyRoute(() => import("@/modules/gallery/views/GalleryOnboardingView.vue")),
  },
  {
    name: "gallery-login",
    path: "/gallery/login/",
    async: lazyRoute(() => import("@/modules/gallery/views/GalleryLoginView.vue")),
  },
  {
    name: "gallery-agenda",
    path: "/gallery/agenda/",
    async: lazyRoute(() => import("@/modules/gallery/views/GalleryAgendaView.vue")),
  },
  {
    name: "gallery-featured",
    path: "/gallery/featured/:id/",
    async: lazyRoute(() => import("@/modules/gallery/views/GalleryFeaturedView.vue")),
  },
  {
    name: "gallery-section",
    path: "/gallery/:section/",
    async: lazyRoute(() => import("@/modules/gallery/views/GallerySectionView.vue")),
  },
];

export default galleryRoutes;
