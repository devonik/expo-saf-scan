const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Declares other apps under `<queries>` in the Android manifest, so
 * `getInstallTime` can see them (package visibility, Android 11+). Usage in
 * app.json: `["expo-saf-scan", { "packages": ["com.whatsapp"] }]`.
 *
 * @param {import('expo/config-plugins').ExpoConfig} config
 * @param {{ packages?: string[] }} [props]
 */
module.exports = function withExpoSafScan(config, { packages = [] } = {}) {
  if (packages.length === 0) return config;
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.queries = manifest.queries ?? [{}];
    const queries = manifest.queries[0];
    queries.package = queries.package ?? [];
    for (const name of packages) {
      if (!queries.package.some((entry) => entry.$['android:name'] === name)) {
        queries.package.push({ $: { 'android:name': name } });
      }
    }
    return config;
  });
};
