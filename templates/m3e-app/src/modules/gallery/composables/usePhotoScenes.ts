import type { PhotoItem } from "@cavulsqa/m3e-vue";

type SceneKind = "mountains" | "coast" | "dunes" | "city" | "forest" | "harbour";

interface Scene {
  kind: SceneKind;
  width: number;
  height: number;
}

const SCENES: readonly Scene[] = [
  { kind: "mountains", width: 1600, height: 1200 },
  { kind: "coast", width: 1200, height: 1600 },
  { kind: "dunes", width: 2400, height: 1000 },
  { kind: "city", width: 1600, height: 1200 },
  { kind: "forest", width: 1200, height: 1600 },
  { kind: "harbour", width: 1600, height: 1200 },
];

function token(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--md-sys-color-${name}`)
    .trim();
}

function ridge(width: number, height: number, base: number, peaks: number, seed: number): string {
  const points = [`0,${height}`];
  for (let i = 0; i <= peaks; i++) {
    const x = (i / peaks) * width;
    const wave = Math.sin(i * 1.7 + seed) * 0.5 + Math.sin(i * 0.6 + seed * 2) * 0.5;
    points.push(`${x.toFixed(0)},${(height * base - wave * height * 0.12).toFixed(0)}`);
  }
  points.push(`${width},${height}`);
  return points.join(" ");
}

function scene({ kind, width, height }: Scene): string {
  const sky = token("primary-container");
  const glow = token("tertiary-container");
  const sun = token("tertiary");
  const far = token("secondary");
  const near = token("primary");
  const deep = token("on-primary-container");
  const seed = kind.length;
  const shapes: Record<SceneKind, string> = {
    mountains: `<polygon points="${ridge(width, height, 0.55, 7, seed)}" fill="${far}" opacity=".7"/><polygon points="${ridge(width, height, 0.72, 5, seed + 2)}" fill="${near}"/>`,
    coast: `<rect y="${height * 0.6}" width="${width}" height="${height * 0.4}" fill="${far}"/><polygon points="${ridge(width, height, 0.78, 3, seed)}" fill="${near}"/>`,
    dunes: `<polygon points="${ridge(width, height, 0.62, 4, seed)}" fill="${glow}"/><polygon points="${ridge(width, height, 0.78, 3, seed + 1)}" fill="${sun}" opacity=".8"/>`,
    city: Array.from({ length: 14 }, (_, i) => {
      const w = width / 14;
      const h = height * (0.25 + ((i * 37) % 9) / 22);
      return `<rect x="${i * w + 4}" y="${height - h}" width="${w - 8}" height="${h}" fill="${i % 2 ? near : far}"/>`;
    }).join(""),
    forest: Array.from({ length: 9 }, (_, i) => {
      const x = (i + 0.5) * (width / 9);
      const top = height * (0.45 + ((i * 13) % 5) / 20);
      return `<polygon points="${x},${top} ${x - 90},${height} ${x + 90},${height}" fill="${i % 2 ? near : far}"/>`;
    }).join(""),
    harbour: `<rect y="${height * 0.65}" width="${width}" height="${height * 0.35}" fill="${far}"/><polygon points="${width * 0.42},${height * 0.62} ${width * 0.58},${height * 0.62} ${width * 0.55},${height * 0.68} ${width * 0.45},${height * 0.68}" fill="${deep}"/><polygon points="${width * 0.5},${height * 0.3} ${width * 0.5},${height * 0.6} ${width * 0.6},${height * 0.6}" fill="${glow}"/>`,
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="${glow}"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#s)"/><circle cx="${width * 0.72}" cy="${height * 0.28}" r="${Math.min(width, height) * 0.09}" fill="${sun}"/>${shapes[kind]}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Demo photos drawn from the live theme, so the gallery needs no network and no bundled images:
 * vector scenes at photo sizes - landscape, portrait and panorama - that stay sharp when zoomed.
 */
export function usePhotoScenes(label: (kind: SceneKind) => string) {
  const photos = shallowRef<PhotoItem[]>([]);
  const build = () => {
    photos.value = SCENES.map((item) => ({
      src: scene(item),
      alt: label(item.kind),
      caption: label(item.kind),
      width: item.width,
      height: item.height,
    }));
  };
  onMounted(build);
  return { photos, rebuild: build };
}
