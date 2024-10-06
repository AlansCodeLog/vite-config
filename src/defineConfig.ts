import { defu } from 'defu';
import { defineConfig as defineVitestConfig } from "vitest/config";
import glob from "fast-glob"
import path from "path"
import { externalizeDeps } from "vite-plugin-externalize-deps"
import type { PluginOption, UserConfig } from "vite";


import { run } from "@alanscodelog/utils/run.js"
type ExternalizeDepsOptions = Parameters<typeof externalizeDeps>[0]

type TypePluginOptions = {
	dtsGenerator?: string,
	additionalArgs?: string,
	rootDir?: string,
	/** Use a typescript project file to generate types.
	 *
	 * No additional flags except `--emitDeclarationOnly --declaration --declarationMap` will be passed.
	 */
	project?: string,
}

/**
 * Generates types for the project.
 *
 * By default sets the outDir to the vite output directory and uses `src` as the root directory (Careful, if it's changed via vite, it cannot detect it!).
 *
 * Also passes the flags `--noEmit false --allowJs false --skipLibCheck --removeComments false` unless a project is specified.
 *
 */
const typesPlugin = ({
	dtsGenerator = "tsc",
	rootDir = "src",
	additionalArgs = "",
		project = undefined ,
}:TypePluginOptions = {}):PluginOption => ({
	name: "typesPlugin",
	writeBundle: async (options) => {
		const outDir = options.dir
		if (!outDir) {
			throw new Error("outDir is not defined")
		}
		const finalArgs =  "--emitDeclarationOnly --declaration --declarationMap " + (project 
		? `-p ${project}` 
		: [
			`--outDir ${outDir}`,
			`--rootDir ${rootDir}`,
			`--noEmit false`,
			`--allowJs false`,
			`--skipLibCheck`,
			// preserve documentation
			`--removeComments false`,
		].join(" "))
		+ " " + additionalArgs
		const fullCommand = `${dtsGenerator} ${finalArgs}`
		await run(fullCommand, {stdio: "inherit"}).promise.catch(() => { process.exit(1) })
	},
})

export const defineConfig = (
	opts?: Partial<{
		pluginOpts: Partial<{
			typesPlugin: TypePluginOptions
			externalizeDeps: ExternalizeDepsOptions
		}>,
		debug?: boolean
	}>,
	overrideConfig?: UserConfig
) =>   {
	const baseConfig: UserConfig = {
		plugins: [
			// it isn't enough to just pass the deps list to rollup.external since it will not exclude subpath exports
			externalizeDeps(opts?.pluginOpts?.externalizeDeps),
			typesPlugin(opts?.pluginOpts?.typesPlugin),
		],
		build: {
			outDir: "dist",
			lib: {
				entry: glob.sync([
					path.resolve(process.cwd(), "src/**/*.ts"),
				]),
				formats: ["es"],
			},
			rollupOptions: {
				output: {
					preserveModulesRoot: "src",
					preserveModules: true,
				},
			},
			minify: false,
		},
		test: {
			cache: process.env.CI ? false : undefined,
		},
	}

	const config =	defineVitestConfig(defu(
		overrideConfig as any,
		baseConfig
	))
	if (opts?.debug) {
		console.log(config)
	}
	return config
}
