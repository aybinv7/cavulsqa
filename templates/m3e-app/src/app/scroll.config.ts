/**
 * How the bars behave while a page scrolls - one place for the whole app; a page can still pass its
 * own `scrollBehavior` to `AppPage`.
 *
 * - `topAppBar`: `"enterAlways"` slides a small top app bar away with the content as it scrolls
 *   down and brings it back the moment it scrolls up (Compose's enter-always); `"pinned"` keeps it.
 *   The large and medium bars collapse into their small bar either way.
 * - `navigationBar`: `"hideOnScroll"` slides the navigation bar off the bottom while scrolling down
 *   and back on the way up, at the top and at the end of the content (Material's hide-on-scroll);
 *   `"pinned"` keeps it.
 */
export interface ScrollBehaviorConfig {
  topAppBar: "pinned" | "enterAlways";
  navigationBar: "pinned" | "hideOnScroll";
}

export const SCROLL_BEHAVIOR: ScrollBehaviorConfig = {
  topAppBar: "enterAlways",
  navigationBar: "hideOnScroll",
};
