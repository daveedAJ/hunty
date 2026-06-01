const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

const emptyModule = path.resolve(projectRoot, "shims/empty.js");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  crypto: emptyModule,
  stream: emptyModule,
  http: emptyModule,
  https: emptyModule,
  os: emptyModule,
  net: emptyModule,
  tls: emptyModule,
  fs: emptyModule,
  path: emptyModule,
  buffer: path.resolve(projectRoot, "node_modules/buffer"),
  url: path.resolve(projectRoot, "node_modules/react-native-url-polyfill"),
};

module.exports = config;
