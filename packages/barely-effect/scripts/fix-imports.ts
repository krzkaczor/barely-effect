/**
 * Post-build script to add .js extensions to relative imports in compiled output.
 * Required for Deno compatibility.
 */
import { Effect } from "effect"

import {
  AbsolutePath,
  FileSystem,
  glob,
  type FsDirAccessError,
  type FsFileAccessError,
  type FsFileWriteError,
  type IFileSystem,
} from "../src/platform/filesystem"

export function fixImportsInDirectory(
  distDir: AbsolutePath,
  fs: IFileSystem,
): Effect.Effect<void, FsDirAccessError | FsFileAccessError | FsFileWriteError> {
  return Effect.gen(function* () {
    const jsFiles = yield* glob({ pattern: "**/*.js", cwd: distDir, onlyFiles: true }, fs)

    for (const filePath of jsFiles) {
      yield* fixImportsInFile(filePath, fs)
    }
  })
}

function fixImportsInFile(
  filePath: AbsolutePath,
  fs: IFileSystem,
): Effect.Effect<void, FsFileAccessError | FsFileWriteError> {
  return Effect.gen(function* () {
    const content = yield* fs.readFile(filePath)
    const fileDir = filePath.getDirPath()

    const importRegex = /from\s+["'](\.[^"']+)["']/g
    let fixed = content
    const matches = [...content.matchAll(importRegex)]

    for (const match of matches) {
      const importPath = match[1]!
      if (importPath.endsWith(".js") || importPath.endsWith(".json")) {
        continue
      }

      const resolvedPath = fileDir.join(importPath)
      const entry = yield* fs.get(resolvedPath)
      const isDir = entry?.type === "dir"

      const newImport = isDir ? `from "${importPath}/index.js"` : `from "${importPath}.js"`
      fixed = fixed.replace(match[0], newImport)
    }

    if (fixed !== content) {
      yield* fs.writeFile(filePath, fixed)
    }
  })
}

if (import.meta.main) {
  const distDir = AbsolutePath(import.meta.dirname).join("../dist")
  await Effect.runPromise(fixImportsInDirectory(distDir, new FileSystem()))
}
