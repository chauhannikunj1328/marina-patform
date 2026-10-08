// The app imports plain TypeScript from ../../packages/shared (outside this folder),
// so Metro needs to watch that folder too. Module paths come from tsconfig.json.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, "../../packages/shared")];

module.exports = config;
