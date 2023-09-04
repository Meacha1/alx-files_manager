module.exports = {
    presets: [
      '@babel/preset-env', // Transpile modern JavaScript
    ],
    plugins: [
      // Add Babel plugins as needed
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-object-rest-spread',
        '@babel/plugin-transform-runtime',
        '@babel/plugin-syntax-dynamic-import',
        '@babel/plugin-transform-async-to-generator',
    ],
  };
  