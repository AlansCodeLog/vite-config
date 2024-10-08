import { defu } from 'defu';
import { defineConfig as defineVitestConfig } from "vitest/config";
import glob from "fast-glob"
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
		const finalArgs = 
		(project 
			? `-p ${project}` 
			: ""
		) + " " + (noFlags ? "" : [
			`--emitDeclarationOnly`,`--declaration`,`--declarationMap`,
			`--outDir ${outDir}`,
			`--rootDir ${rootDir}`,
			`--noEmit false`,
			`--allowJs false`,
			`--skipLibCheck`,
			// preserve documentation
			`--removeComments false`,
		].join(" "))
		+ " " + additionalArgs
		await (async () => {
		const args = finalArgs.split(" ")
			const child = spawn(dtsGenerator, args, { shell: true, stdio: "inherit", })
			
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

export const defineConfig = (
	opts?: Partial<{
		pluginOpts: Partial<{
			typesPlugin: TypePluginOptions
			externalizeDeps: ExternalizeDepsOptions
		}>,
		debug?: boolean
	}>,
	overrideConfig?: VitestConfigOptions 
) =>   {
	const baseConfig: VitestConfigOptions = {
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
			exclude: [
				...vitestDefaults.exclude,
				// for nix devenv
				".direnv/**/*"
			]
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
