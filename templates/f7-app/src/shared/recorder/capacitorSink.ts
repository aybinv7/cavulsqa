import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import type { RecorderSink, SessionManifest } from "@cavulsqa/recorder";

const CAPTURE_DIR = "capu";
const BASE64_CHUNK = 0x8000;

export interface CaptureFile {
  name: string;
  size: number;
  modifiedAt: number;
}

interface BrowserCapture {
  name: string;
  blob: Blob;
  size: number;
  savedAt: number;
}

const browserCaptures = new Map<string, BrowserCapture>();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK) {
    const chunk = bytes.subarray(offset, offset + BASE64_CHUNK);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function fileNameFor(manifest: SessionManifest): string {
  return `${manifest.sessionId}-${String(Date.now())}.capu`;
}

function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function saveNative(archive: Uint8Array, manifest: SessionManifest): Promise<void> {
  const path = `${CAPTURE_DIR}/${fileNameFor(manifest)}`;
  await Filesystem.writeFile({
    path,
    data: bytesToBase64(archive),
    directory: Directory.External,
    recursive: true,
  });
  const { uri } = await Filesystem.getUri({ path, directory: Directory.External });
  await Share.share({ url: uri, title: manifest.label });
}

function saveBrowser(archive: Uint8Array, manifest: SessionManifest): void {
  const name = fileNameFor(manifest);
  const blob = new Blob([archive as Uint8Array<ArrayBuffer>], { type: "application/zip" });
  browserCaptures.set(name, { name, blob, size: blob.size, savedAt: Date.now() });
  downloadBlob(name, blob);
}

/**
 * On native, writes a finished `.capu` under `capu/<sessionId>-<ts>.capu` in the app's external
 * storage and opens the Android share sheet. Off-device (`vp dev` in a browser) it triggers a blob
 * download instead, since `Filesystem`/`Share` have nothing to write to there.
 */
export function createCapacitorSink(): RecorderSink {
  return {
    async save(archive, manifest) {
      if (Capacitor.isNativePlatform()) {
        await saveNative(archive, manifest);
      } else {
        saveBrowser(archive, manifest);
      }
    },
  };
}

/** Lists previously captured `.capu` files for the Settings diagnostics list, newest first. */
export async function listCaptures(): Promise<CaptureFile[]> {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await Filesystem.readdir({
        path: CAPTURE_DIR,
        directory: Directory.External,
      });
      return result.files
        .filter((file) => file.type === "file")
        .map((file) => ({ name: file.name, size: file.size, modifiedAt: file.mtime }))
        .sort((a, b) => b.modifiedAt - a.modifiedAt);
    } catch {
      return [];
    }
  }
  return [...browserCaptures.values()]
    .map((capture) => ({ name: capture.name, size: capture.size, modifiedAt: capture.savedAt }))
    .sort((a, b) => b.modifiedAt - a.modifiedAt);
}

/** Re-opens the Android share sheet for a previously captured file; on browser, re-triggers the download. */
export async function shareCapture(name: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const path = `${CAPTURE_DIR}/${name}`;
    const { uri } = await Filesystem.getUri({ path, directory: Directory.External });
    await Share.share({ url: uri });
    return;
  }
  const capture = browserCaptures.get(name);
  if (capture) downloadBlob(name, capture.blob);
}

/** Permanently deletes a previously captured file. */
export async function deleteCapture(name: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Filesystem.deleteFile({ path: `${CAPTURE_DIR}/${name}`, directory: Directory.External });
    return;
  }
  browserCaptures.delete(name);
}
