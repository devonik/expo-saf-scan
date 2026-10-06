// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// npm v7+ will install ../node_modules/react and ../node_modules/react-native because of peerDependencies.
// To prevent the incompatible react-native between ./node_modules/react-native and ../node_modules/react-native,
// excludes the one from the parent folder when bundling.
config.resolver.blockList = [
  ...Array.from(config.resolver.blockList ?? []),
  // On windows the path will resolve with `\`. We need to escape it with `\\` for the RegExp.
  new RegExp(path.resolve('..', 'node_modules', 'react').replace(/\\/g, '\\\\')),
  new RegExp(path.resolve('..', 'node_modules', 'react-native').replace(/\\/g, '\\\\')),
];

// Packages that must exist once: the module's own dev copies in ../node_modules
// would otherwise load a second time (with expo: "property is not writable").
const SINGLETONS = ['expo', 'expo-modules-core', 'react', 'react-native'];
const fromExample = path.join(__dirname, 'index.ts');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const parts = moduleName.split('/');
  const name = moduleName.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  const origin = SINGLETONS.includes(name) ? { ...context, originModulePath: fromExample } : context;
  return origin.resolveRequest(origin, moduleName, platform);
};
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, './node_modules'),
  path.resolve(__dirname, '../node_modules'),
];

config.resolver.extraNodeModules = {
  'expo-saf-scan': '..',
};

config.watchFolders = [path.resolve(__dirname, '..')];

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
