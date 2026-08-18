module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Lets Metro bundle the raw .sql migration files drizzle-kit generates.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
