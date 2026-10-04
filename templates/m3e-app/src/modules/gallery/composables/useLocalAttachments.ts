import type { MessageImage } from "@cavulsqa/m3e-vue";

const MAX_EDGE = 16_384;

/**
 * Turns files picked on the device - the gallery, the camera, any file - into what a message
 * carries, with no native plugin: Capacitor's web view answers a file input with the system picker,
 * and `capture` opens the camera. Images become object URLs measured once; every URL is revoked
 * with the page, so a long chat does not hold photos in memory after it closes.
 */
export function useLocalAttachments() {
  const urls = new Set<string>();

  async function measure(file: File): Promise<{ width: number; height: number }> {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      try {
        return { width: bitmap.width, height: bitmap.height };
      } finally {
        bitmap.close();
      }
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /** An image file as a message image, or `null` when it cannot be read as one. */
  async function toImage(file: File): Promise<MessageImage | null> {
    if (!file.type.startsWith("image/")) return null;
    try {
      const { width, height } = await measure(file);
      if (!width || !height || Math.max(width, height) > MAX_EDGE) return null;
      const src = URL.createObjectURL(file);
      urls.add(src);
      return { src, width, height, alt: file.name };
    } catch {
      return null;
    }
  }

  function describe(file: File, locale: string): string {
    const units = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;
    let size = file.size;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    const amount = new Intl.NumberFormat(locale, {
      style: "unit",
      unit: units[unit],
      unitDisplay: "short",
      maximumFractionDigits: unit === 0 ? 0 : 1,
    }).format(size);
    return `📄 ${file.name} · ${amount}`;
  }

  onScopeDispose(() => {
    for (const url of urls) URL.revokeObjectURL(url);
    urls.clear();
  });

  return { toImage, describe };
}
