// Reexport the native module. On web, it will be resolved to ExpoSafScanModule.web.ts
// and on native platforms to ExpoSafScanModule.ts
export { default } from './ExpoSafScanModule';
export * from './ExpoSafScan.types';
