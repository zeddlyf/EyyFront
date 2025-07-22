const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  stream: require.resolve('readable-stream'),
  buffer: require.resolve('buffer/'),
  // add other polyfills as needed
};

module.exports = config; 