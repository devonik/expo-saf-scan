import type { ListOptions, PickFolderOptions, SafEntry } from './ExpoSafScan.types';
import ExpoSafScan from './ExpoSafScanModule';

export * from './ExpoSafScan.types';

/** Whether the module can be used: Android only. */
export const isAvailable = ExpoSafScan !== null;

function native() {
  if (!ExpoSafScan) throw new Error('expo-saf-scan is only available on Android.');
  return ExpoSafScan;
}

/**
 * Document URI of a folder on the phone's shared storage, for the picker's
 * `initialUri`, e.g. `externalStorageDocumentUri('Android/media/com.whatsapp/WhatsApp')`.
 */
export function externalStorageDocumentUri(path: string): string {
  const documentId = `primary:${path.replace(/^\/+|\/+$/g, '')}`;
  return `content://com.android.externalstorage.documents/document/${encodeURIComponent(documentId)}`;
}

/**
 * Opens the system folder picker. Resolves with the picked folder's tree URI,
 * or null if the user cancelled. Read and write access is kept across
 * restarts until the app is uninstalled; store the URI to use it later.
 */
export function pickFolderAsync(options: PickFolderOptions = {}): Promise<string | null> {
  return native().pickFolderAsync(options.initialUri ?? null);
}

/** Whether the app still holds read and write access to a picked folder. */
export function hasAccess(treeUri: string): boolean {
  return native().hasAccess(treeUri);
}

/**
 * Lists a picked folder with one provider query per folder, including size,
 * MIME type and date of every entry.
 */
export function listAsync(treeUri: string, options: ListOptions = {}): Promise<SafEntry[]> {
  return native().listAsync(treeUri, options);
}

/**
 * File URI of a cached JPEG of a photo or video, at most `maxSize` px on its
 * longer side; null if the file can't be read. Takes a document URI from a
 * picked folder or a media library `content://` URI. Uses the thumbnail
 * Android usually keeps already, otherwise decodes at a fraction of the size
 * (a video's first frame); never reads the whole file into memory.
 */
export function thumbnailAsync(
  uri: string,
  { maxSize = 512 }: { maxSize?: number } = {}
): Promise<string | null> {
  return native().thumbnailAsync(uri, Math.round(maxSize));
}

/**
 * File URI of a cached JPEG of a video's first frame, at most `maxSize` px on
 * its longer side; null if the video can't be read.
 *
 * @deprecated Use `thumbnailAsync`, which covers photos and videos. Removed in 2.0.0.
 */
export function videoThumbnailAsync(
  uri: string,
  { maxSize = 512 }: { maxSize?: number } = {}
): Promise<string | null> {
  return native().videoThumbnailAsync(uri, Math.round(maxSize));
}

/** Deletes files or folders for good (there is no trash). Resolves with the URIs that are gone afterwards. */
export function deleteAsync(uris: string[]): Promise<string[]> {
  return native().deleteAsync(uris);
}

/**
 * When another app was first installed on this phone, in ms; null if it isn't
 * installed. Android 11+ only reveals apps declared in the manifest's
 * `<queries>`: add them with this package's config plugin.
 */
export function getInstallTime(packageName: string): number | null {
  return native().getInstallTime(packageName);
}
