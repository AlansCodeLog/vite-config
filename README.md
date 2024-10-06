# Vite Config

My default vite config for typescript libraries (builds each file as an entry).

Uses `externalize-deps` to externalize dependencies and a custom type plugin to run `tsc --emitDeclarationOnly` using `tsconfig.types.json` (both command, arguments, and project are customizable).
