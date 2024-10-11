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
