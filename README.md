[![Docs][docs-src]][docs-href]
[![Release][release-src]][release-href]
[![npm version][npm-version-src]][npm-version-href]
[![License][license-src]][license-href]

# Vite Config

A wrapper around my preferred default vite config for typescript libraries (builds each file as an entry).

Uses `externalize-deps` to externalize dependencies and a custom type plugin to run `tsc --emitDeclarationOnly` using `tsconfig.types.json` (both command, arguments, and project are customizable).

## Usage

```ts
import { defineConfig } from "@alanscodelog/vite-config";

// For example, for a vue project, I might do:
export default defineConfig({
	// wrapper opts
	entryGlobs: ["src/**/*.vue", "!src/**/*.stories.*"],
	pluginOptions: {
		typesPlugin: { dtsGenerator: "vue-tsc" }
	},
}, {
	// opts to merge
	plugins: [
		vue() as any,
	],
}, {
	// opts to override
});
```

<!-- Badges -->
[docs-src]: https://github.com/alanscodelog/vite-config/actions/workflows/docs.yml/badge.svg
[docs-href]: https://github.com/alanscodelog/vite-config/actions/workflows/docs.yml
[release-src]: https://github.com/alanscodelog/vite-config/actions/workflows/release.yml/badge.svg
[release-href]: https://github.com/alanscodelog/vite-config/actions/workflows/release.yml
[npm-version-src]: https://img.shields.io/npm/v/@alanscodelog/vite-config/latest
[npm-version-href]: https://www.npmjs.com/package/@alanscodelog/vite-config/v/latest
[license-src]: https://img.shields.io/npm/l/@alanscodelog/vite-config.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/@alanscodelog/vite-config
