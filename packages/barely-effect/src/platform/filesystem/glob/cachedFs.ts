import { Effect } from "effect"

import type { AbsolutePath } from "../AbsolutePath"
import type { FsDirAccessError, FileSystemEntry, IFileSystem } from "../IFileSystem"

export interface GlobFs {
  get(path: AbsolutePath): Effect.Effect<FileSystemEntry | undefined>
  listDir(path: AbsolutePath): Effect.Effect<FileSystemEntry[], FsDirAccessError>
}

export function createCachedFs(fs: IFileSystem): GlobFs {
  const getCache = new Map<string, FileSystemEntry | undefined>()
  const listDirCache = new Map<string, FileSystemEntry[]>()

  return {
    get(path: AbsolutePath): Effect.Effect<FileSystemEntry | undefined> {
      const key = path.path
      if (getCache.has(key)) {
        return Effect.succeed(getCache.get(key))
      }
      return fs.get(path).pipe(
        Effect.tap((result) =>
          Effect.sync(() => {
            getCache.set(key, result)
          }),
        ),
      )
    },
    listDir(path: AbsolutePath): Effect.Effect<FileSystemEntry[], FsDirAccessError> {
      const key = path.path
      if (listDirCache.has(key)) {
        return Effect.succeed(listDirCache.get(key)!)
      }
      return fs.listDir(path).pipe(
        Effect.tap((result) =>
          Effect.sync(() => {
            listDirCache.set(key, result)
          }),
        ),
      )
    },
  }
}
