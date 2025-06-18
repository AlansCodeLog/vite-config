import { createDefu, defu } from 'defu';
import {inspect} from 'util'
import { defineConfig as defineVitestConfig } from "vitest/config";
import fastGlob from "fast-glob"
import path from "path"
import { externalizeDeps } from "vite-plugin-externalize-deps"
import type { PluginOption } from "vite";
import { configDefaults as vitestDefaults } from 'vitest/config';
import { spawn } from 'child_process';

type VitestConfigOptions = Parameters<typeof defineVitestConfig>[0]

type ExternalizeDepsOptions = Parameters<typeof externalizeDeps>[0]

type TypePluginOptions = {
	dtsGenerator?: string,
	additionalArgs?: string,
	rootDir?: string,
	/** The typescript project file to generate types.
	 * @default tsconfig.types.json
	 */
	project?: string,
	/**
	 * By default the following flags are passed:
	 *
	 * @default --emitDeclarationOnly --declaration --declarationMap --outDir {outDir} --rootDir {rootDir} --noEmit false --allowJs false --skip
	 */
	noFlags?: boolean,
}

/**
 * Generates types for the project.
 *
 * By default sets the outDir to the vite output directory and uses `src` as the root directory (careful, if it's changed via vite, it cannot detect it!).
 *
 * Passes several flags related to type declaration, see {@link TypePluginOptions.noFlags} for more info.
 */
const typesPlugin = ({
	dtsGenerator = "tsc",
	rootDir = "src",
	additionalArgs = "",
	noFlags = false,
	project = "tsconfig.types.json" ,
}:TypePluginOptions = {}):PluginOption => ({
	name: "typesPlugin",
	writeBundle: async (options) => {
		const outDir = options.dir
		if (!outDir) {
			throw new Error("outDir is not defined")
		}
		const finalArgs = [
			...(project ? [`-p ${project}`] : []),
			...(noFlags ? [] : [
				`--emitDeclarationOnly`,`--declaration`,`--declarationMap`,
				`--outDir ${outDir}`,
				`--rootDir ${rootDir}`,
				`--noEmit false`,
				`--allowJs false`,
				`--skipLibCheck`,
				// preserve documentation
				`--removeComments false`,
			]),
			...(additionalArgs ? [additionalArgs] : [])
		].join(" ")
		await (async () => {
			const args = finalArgs.split(" ")
			const child = spawn(dtsGenerator, args, { stdio: "inherit", })
			
			const code: number = await new Promise(resolve => {
				child.on("close", err => {
					resolve(err ?? 0)
				})
				child.on("exit", err => {
					resolve(err ?? 0)
				})
			})
		})().catch(() => { process.exit(1) })

	},
})

function globsToEntries(globs: string[]) {
	const include = globs.filter(g => !g.startsWith("!"))
	const ignore = globs.filter(g => g.startsWith("!"))
	const entries = fastGlob.globSync(include, {
		onlyFiles: true,
		ignore,
		cwd: process.cwd(),
	})
	return entries
}

export const defineConfig = (
	opts?: Partial<{
		/**
		 * Replaces the default entry globs with the ones specified. Globs should be relative to `process.cwd()`. 
		 *
		 * Globs starting with `!` will be added to ignore list instead.
		 */
		entryGlobs: string[]
		pluginOpts: Partial<{
			typesPlugin: TypePluginOptions
			externalizeDeps: ExternalizeDepsOptions
		}>,
		debug?: boolean | ((config: VitestConfigOptions) => void)
	}>,
	mergeConfig?: Awaited<VitestConfigOptions>,
	overrideConfig?: Awaited<VitestConfigOptions>,
) => ({mode}:{mode:string})=>{
	const baseConfig: VitestConfigOptions = {
		plugins: [
			// it isn't enough to just pass the deps list to rollup.external since it will not exclude subpath exports
			externalizeDeps(opts?.pluginOpts?.externalizeDeps) as any,
			typesPlugin(opts?.pluginOpts?.typesPlugin) as any,
		],
		build: {
			outDir: "dist",
			lib: {
				entry: opts?.entryGlobs
				? globsToEntries(opts.entryGlobs)
				: globsToEntries(["src/**/*.ts"]),
				formats: ["es"],
			},
			rollupOptions: {
				output: {
					preserveModulesRoot: "src",
					preserveModules: true,
				},
			},
			minify: false,
			emptyOutDir: mode === "production", // for dev hmr in monorepo
		},
		test: {
			cache: process.env.CI ? false : undefined,
			exclude: [
				...vitestDefaults.exclude,
				// for nix devenv
				".direnv/**/*"
			]
		},
	}

	const overrider = createDefu((obj, key, value) => {
		const val = obj[key]
		if (typeof val!== "object" || Array.isArray(val)) {
			obj[key] = value;
			return true;
		}
		return false
	});
	const config =	overrider(
		overrideConfig as any,
		defineVitestConfig(
			defu(mergeConfig as any, baseConfig)
		)
	)

	if (opts?.debug) {
		if (typeof opts.debug === "boolean") {
		console.log(inspect(config, false, 5, true))
		} else if (typeof opts.debug === "function") {
			console.log(opts.debug(config))
		}
	}
	return config
}
