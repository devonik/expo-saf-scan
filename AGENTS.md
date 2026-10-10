# expo-saf-scan — notes for agents

Expo module (Android only) for folders picked with the Storage Access
Framework: listing, thumbnails, deleting, folder picker, install time of other
apps. Used in production by [Pikuro](https://pikuro.app) (`../pikuro`).

## Releasing

Before every release, in this order:

1. **README up to date.** Every new or changed function is in the feature list
   and the API section, deprecated ones are marked, and the usage example still
   works. npm shows the README of the published version, so a README fix
   needs a new (patch) release.
2. **CHANGELOG.md:** turn `## Unpublished` into `## <version> — <date>`
   (Expo module style: 🎉 New features, 🐛 Bug fixes, 💡 Others).
3. **Version** in `package.json` (SemVer; removing an API is a major release).
4. **Test the package as it will be published** before publishing:
   `pnpm pack`, install the tarball in Pikuro
   (`pnpm add expo-saf-scan@file:<path>.tgz`), build and run its tests. Switch
   Pikuro back to the npm version afterwards.
5. Commit `Release <version>`, tag `v<version>`, push with tags.
6. **Publishing is done by Niklas:** `npm publish` needs two-factor
   confirmation in the browser. A new version can take a few minutes to show
   up on npm.

## Conventions

- Everything shipped (code, comments, README, commits) in English.
- Native code is Kotlin in `android/src/main/java/dev/devnik/safscan/`; long
  calls run on `Dispatchers.IO`.
- `pnpm build`, `pnpm lint`, and the tests (`npx jest --no-watchman` when
  Watchman isn't allowed) before declaring a change done.
