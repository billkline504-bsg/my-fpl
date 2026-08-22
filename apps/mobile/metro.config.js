const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// pnpm keeps workspace packages as symlinks and hoists shared deps to the
// repo root — Metro needs to know to follow both.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.unstable_enableSymlinks = true;

// packages/shared ships TypeScript source with explicit ".js" extensions on
// relative imports (required for Node's NodeNext ESM resolution, which the
// API package uses). Metro doesn't resolve ".js" specifiers to ".ts"/".tsx"
// files on its own. Try normal resolution FIRST and only strip the
// extension as a fallback when that fails — resolving it eagerly breaks
// legitimate ".js" imports inside npm packages that intentionally ship
// separate CJS/ESM files (e.g. merge-options' "./index.js" self-reference).
const { resolveRequest: defaultResolveRequest } = config.resolver;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolveNormally = defaultResolveRequest ?? context.resolveRequest;
  try {
    return resolveNormally(context, moduleName, platform);
  } catch (err) {
    if (moduleName.startsWith(".") && moduleName.endsWith(".js")) {
      return resolveNormally(context, moduleName.slice(0, -3), platform);
    }
    throw err;
  }
};

module.exports = config;
