const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Drizzle migrations are imported as source (see babel.config.js).
config.resolver.sourceExts.push('sql');

module.exports = config;
