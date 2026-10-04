const KEEP = new Set([
  "P",
  "BR",
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "S",
  "STRIKE",
  "DEL",
  "UL",
  "OL",
  "LI",
  "A",
  "BLOCKQUOTE",
  "H2",
  "H3",
]);
const RENAME: Record<string, string> = { DIV: "p", STRONG: "b", EM: "i", STRIKE: "s", DEL: "s" };
const DROP = new Set([
  "SCRIPT",
  "STYLE",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "TEMPLATE",
  "NOSCRIPT",
  "SVG",
  "MATH",
  "LINK",
  "META",
  "TITLE",
  "HEAD",
]);
const SAFE_LINK = /^(https?:|mailto:|tel:)/i;

/** Whether a link target is one a reader can follow without running anything. */
export function isSafeHref(href: string): boolean {
  return SAFE_LINK.test(href.trim());
}

function clean(source: Node, target: Node, document: Document) {
  for (const node of source.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(node.textContent ?? ""));
      continue;
    }
    if (!(node instanceof Element) || DROP.has(node.tagName.toUpperCase())) continue;
    const tag = node.tagName.toUpperCase();
    if (!KEEP.has(tag) && !RENAME[tag]) {
      clean(node, target, document);
      continue;
    }
    const element = document.createElement(RENAME[tag] ?? tag.toLowerCase());
    if (tag === "A") {
      const href = node.getAttribute("href") ?? "";
      if (!isSafeHref(href)) {
        clean(node, target, document);
        continue;
      }
      element.setAttribute("href", href.trim());
      element.setAttribute("rel", "noopener noreferrer nofollow");
      element.setAttribute("target", "_blank");
    }
    clean(node, element, document);
    target.appendChild(element);
  }
}

/**
 * Reduces HTML to the formatting a text editor produces - paragraphs, line breaks, bold, italic,
 * underline, strikethrough, lists, quotes, two heading levels and links - and nothing else: no
 * attributes but a link's address, no scripts, styles or handlers, and only `http`, `https`,
 * `mailto` and `tel` links. Unknown elements give up their text; `div`s become paragraphs.
 * Parsing happens in an inert document, so nothing in the input loads or runs.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const output = document.implementation.createHTMLDocument("");
  const root = output.createElement("div");
  clean(parsed.body, root, output);
  return root.innerHTML;
}
