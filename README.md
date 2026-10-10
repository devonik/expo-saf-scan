# expo-saf-scan

Fast listing, video thumbnails and deleting in folders picked with Android's
Storage Access Framework (SAF), as an [Expo module](https://docs.expo.dev/modules/overview/).

Android lets apps read another app's shared folder, like WhatsApp's media in
`Android/media/com.whatsapp/WhatsApp`, only after the user picks it in the
system folder picker. Listing such a folder with a document-file wrapper asks
the system once per file for every property (type, size, date), which takes
close to a minute for a few thousand files. `expo-saf-scan` asks once per
folder.

| Listing 3,074 files (WhatsApp media folder) | Time |
| --- | --- |
| `expo-file-system` (`Directory.list()`, size, modification time) | 54.8 s |
| **`expo-saf-scan`** (`listAsync(…, { recursive: true })`) | **2.6 s** |

Measured with the [example app](example) in a debug build on an Android 16
emulator (Pixel 9a). Both get faster in a release build; the gap stays.

<img src="https://raw.githubusercontent.com/devonik/expo-saf-scan/main/docs/example-app.png" width="270" alt="The example app: expo-saf-scan lists 3,074 files in 2.6 s, expo-file-system in 54.8 s; below, thumbnails of photos and videos from the picked folder.">

Built for [Pikuro](https://pikuro.app), where it powers the WhatsApp cleanup.

## Features

- **Folder picker** that opens at a given folder and keeps read/write access across restarts
- **Fast listing**: one query per folder with name, size, MIME type and date, optionally recursive (subfolders in parallel)
- **Video thumbnails** from the first frame, cached as small JPEGs, without reading the whole video into memory (image components load the full file for a video URI)
- **Batch delete**
- **Install time of other apps**, with a config plugin for the `<queries>` entry Android 11+ needs

Android only: iOS has no equivalent of picking another app's folder. On iOS
and web, `isAvailable` is `false`.

## Installation

```sh
npx expo install expo-saf-scan
```

It contains native code, so it needs a [development build](https://docs.expo.dev/develop/development-builds/introduction/)
(not Expo Go). In a bare React Native app, [install Expo modules](https://docs.expo.dev/bare/installing-expo-modules/) first.

To read the install time of other apps, declare them with the config plugin in `app.json`:

```json
{
  "expo": {
    "plugins": [["expo-saf-scan", { "packages": ["com.whatsapp"] }]]
  }
}
```

## Usage

```ts
import {
  externalStorageDocumentUri,
  hasAccess,
  listAsync,
  pickFolderAsync,
  thumbnailAsync,
} from 'expo-saf-scan';

// Opens the system picker right in WhatsApp's folder; the user taps "Use this folder" and "Allow".
const treeUri = await pickFolderAsync({
  initialUri: externalStorageDocumentUri('Android/media/com.whatsapp/WhatsApp'),
});
if (!treeUri) return; // Cancelled.
// Store treeUri: access stays until the app is uninstalled. Check it later with hasAccess(treeUri).

const entries = await listAsync(treeUri, { recursive: true });
const media = entries.filter((entry) => /^(image|video)\//.test(entry.mimeType ?? ''));
const thumbnail = await thumbnailAsync(media[0].uri, { maxSize: 256 }); // file:// URI of a JPEG
```

## API

### `pickFolderAsync(options?): Promise<string | null>`

Opens the system folder picker. Resolves with the picked folder's tree URI, or
`null` if the user cancelled. Read and write access is kept across restarts.

- `initialUri`: document URI where the picker opens, see `externalStorageDocumentUri`.

Android doesn't allow picking the storage root, `Download/`, `Android/data/`
or `Android/obb/`. `Android/media/<package>` works.

### `externalStorageDocumentUri(path): string`

Document URI of a path on the phone's shared storage, for `initialUri`:
`externalStorageDocumentUri('DCIM/Camera')`.

### `hasAccess(treeUri): boolean`

Whether the app still holds read and write access to a picked folder.

### `listAsync(treeUri, options?): Promise<SafEntry[]>`

Lists a picked folder with one query per folder.

- `recursive`: also list all subfolders (default `false`)
- `includeHidden`: include names starting with a dot, like `.nomedia` (default `false`)
- `documentId`: list a subfolder from an earlier listing instead of the picked folder

Each `SafEntry` has `uri`, `documentId`, `name`, `path` (relative to the listed
folder), `isDirectory`, `mimeType`, `size` (bytes) and `lastModified` (ms).

### `thumbnailAsync(uri, { maxSize? }): Promise<string | null>`

File URI of a cached JPEG of a photo or video, at most `maxSize` px (default
512) on its longer side; `null` if the file can't be read. Takes a document URI
from `listAsync` or a media library `content://` URI.

It asks Android for the thumbnail it usually keeps already (the gallery made
it) and only decodes the file when there is none: a photo at a fraction of its
size, a video's first frame. Loading a document URI into an image component
instead decodes the whole photo, and for a video reads the whole file into
memory, which crashes with large videos.

### `videoThumbnailAsync(uri, { maxSize? }): Promise<string | null>`

**Deprecated**, use `thumbnailAsync`. Removed in 2.0.0. File URI of a cached
JPEG of a video's first frame.

### `deleteAsync(uris): Promise<string[]>`

Deletes files or folders for good (there is no trash) and resolves with the
URIs that are gone afterwards, including those that were gone already. Up to 8
deletes run at once. Android shows no confirmation for SAF deletes,
so ask the user first.

### `getInstallTime(packageName): number | null`

When another app was first installed on this phone, in ms; `null` if it isn't
installed or isn't declared with the config plugin. Useful to tell files that
came along with a backup from an older phone.

### `isAvailable: boolean`

`true` on Android.

## Example app

```sh
cd example
pnpm install
npx expo run:android
```

Pick a folder, then compare `expo-saf-scan` with `expo-file-system` on it.

## License

MIT
