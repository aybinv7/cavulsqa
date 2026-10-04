/** One photo in `M3PhotoBrowser`; `width` and `height` let it be fitted before it has loaded. */
export interface PhotoItem {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}
