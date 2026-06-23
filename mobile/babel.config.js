module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Force private class fields (#x) to be transpiled to WeakMap-based code
      // so any version of Hermes can run them.
      ["@babel/plugin-transform-class-properties", { loose: true }],
      ["@babel/plugin-transform-private-methods",  { loose: true }],
    ],
  };
};
