const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// NUCLEAR: transpile everything — no exceptions
// Slower bundling but guaranteed to work with all Hermes versions
config.transformer.transformIgnorePatterns = [];

module.exports = config;
