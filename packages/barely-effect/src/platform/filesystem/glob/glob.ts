import { Effect } from "effect"

import type { FileSystemEntry, FsDirAccessError, IFileSystem } from "../IFileSystem"

import { assert } from "../../../assert"
import { AbsolutePath } from "../AbsolutePath"
import { createCachedFs, type GlobFs } from "./cachedFs"
import { parseGlob, type GlobChunk } from "./parseGlob"

export interface GlobOptions {
  pattern: string
  onlyFiles?: boolean
  cwd: AbsolutePath
}

export function glob(
  options: GlobOptions & { onlyFiles: true },
  fs: IFileSystem,
): Effect.Effect<AbsolutePath[], FsDirAccessError>
export function glob(
  options: GlobOptions & { onlyFiles?: false },
  fs: IFileSystem,
): Effect.Effect<FileSystemEntry[], FsDirAccessError>
export function glob(
  options: GlobOptions,
  fs: IFileSystem,
): Effect.Effect<FileSystemEntry[] | AbsolutePath[], FsDirAccessError> {
  return Effect.gen(function* () {
    const cwd = options.cwd
    const chunks = parseGlob(options.pattern)
    const cachedFs = createCachedFs(fs)

    const entries = yield* matchGlobWalker(chunks, cwd, cachedFs, new Set())

    if (options.onlyFiles) {
      return entries.filter((e) => e.type === "file").map((e) => e.path)
    }

    return entries
  })
}

function matchGlobWalker(
  chunks: GlobChunk[],
  cwd: AbsolutePath,
  fs: GlobFs,
  visited: Set<string>,
): Effect.Effect<FileSystemEntry[], FsDirAccessError> {
  return Effect.gen(function* () {
    const cwdEntry = yield* fs.get(cwd)
    assert(!!cwdEntry, `${cwd.path} does not exist`)

    const [chunk, ...rest] = chunks
    if (!chunk) {
      const alreadyVisited = visited.has(cwd.path)
      if (alreadyVisited) {
        return []
      }

      visited.add(cwd.path)
      return [cwdEntry]
    }

    if (cwdEntry.type === "file") {
      return []
    }

    switch (chunk.type) {
      case "literal": {
        const newCwd = cwd.join(chunk.value)
        if ((yield* fs.get(newCwd)) !== undefined) {
          return yield* matchGlobWalker(rest, newCwd, fs, visited)
        }
        return []
      }

      case "pattern": {
        const entities = yield* fs.listDir(cwd)

        const newCwds = entities
          .filter((entity) => chunk.pattern.test(entity.path.getName()))
          .map((m) => m.path)

        const results = yield* Effect.all(
          newCwds.map((newCwd) => matchGlobWalker(rest, newCwd, fs, visited)),
          { concurrency: "unbounded" },
        )
        return results.flat()
      }

      case "globstar": {
        const entities = yield* fs.listDir(cwd)

        const newCwds = entities.map((m) => m.path)

        const results = yield* Effect.all(
          [
            matchGlobWalker(rest, cwd, fs, visited),
            ...newCwds.map((newCwd) => matchGlobWalker(rest, newCwd, fs, visited)),
            ...newCwds.map((newCwd) => matchGlobWalker(chunks, newCwd, fs, visited)),
          ],
          { concurrency: "unbounded" },
        )

        return results.flat()
      }
    }
  })
}
