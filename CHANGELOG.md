# Changelog

## Unpublished

### 🎉 New features

- `thumbnailAsync` for photos and videos, picked-folder and media library URIs: uses Android's own thumbnail when there is one, otherwise decodes at a fraction of the size.

### 💡 Others

- `deleteAsync` deletes up to 8 files at once instead of one after another.
- `videoThumbnailAsync` is deprecated in favour of `thumbnailAsync` and will be removed in 2.0.0.

## 1.0.0 — 2026-10-06

First stable release, used in production in [Pikuro](https://pikuro.app) since its version 0.9.0. No API changes since 0.1.0.

### 💡 Others

- README: screenshot of the example app with the benchmark.

## 0.1.0 — 2026-10-06

### 🎉 New features

- `pickFolderAsync` with a start folder, `hasAccess`, recursive `listAsync` (one query per folder), `videoThumbnailAsync`, `deleteAsync`, `getInstallTime` and a config plugin for `<queries>`.
