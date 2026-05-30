module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': './',
            '@lib': '../lib',
            '@store': './store',
            '@providers': './providers',
            '@components': './components',
            '@utils': './utils',
            '@config': './config',
            '@services': './services',
          },
        },
      ],
      'nativewind/babel',
      'react-native-reanimated/plugin',
    ],
  };
};
