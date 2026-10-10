import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { ListOptions, SafEntry } from './ExpoSafScan.types';

declare class ExpoSafScanModule extends NativeModule<Record<string, never>> {
  pickFolderAsync(initialUri: string | null): Promise<string | null>;
  hasAccess(treeUri: string): boolean;
  listAsync(treeUri: string, options: ListOptions): Promise<SafEntry[]>;
  thumbnailAsync(uri: string, maxSize: number): Promise<string | null>;
  videoThumbnailAsync(uri: string, maxSize: number): Promise<string | null>;
  deleteAsync(uris: string[]): Promise<string[]>;
  getInstallTime(packageName: string): number | null;
}

/** Null on iOS and web: the Storage Access Framework is Android only. */
export default requireOptionalNativeModule<ExpoSafScanModule>('ExpoSafScan');
