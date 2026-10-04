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
    name: "gallery-section",
    path: "/gallery/:section/",
    async: lazyRoute(() => import("@/modules/gallery/views/GallerySectionView.vue")),
  },
];

export default galleryRoutes;
