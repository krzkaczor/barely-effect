import { Effect } from "effect"
import { access, mkdir, readdir, readFile, rm, rmdir, stat, writeFile } from "node:fs/promises"

import { type AbsolutePath } from "./AbsolutePath"
import {
  FsAlreadyExistsError,
  FsDirNotEmptyError,
  FsDirNotFoundError,
  FsFileIsADirError,
  FsFileNotFoundError,
  FsNotADirError,
  FsOtherError,
  FsParentNotFoundError,
  type FsDirAccessError,
  type FsDirCreateError,
  type FsDirRemoveError,
  type FsFileAccessError,
  type FsFileWriteError,
  type FileSystemEntry,
  type IFileSystem,
} from "./IFileSystem"

export class FileSystem implements IFileSystem {
  readFile(path: AbsolutePath): Effect.Effect<string, FsFileAccessError> {
    return Effect.tryPromise({
      try: () => readFile(path.path, "utf8"),
      catch: (error): FsFileAccessError => {
        if (error instanceof Error && "code" in error) {
          switch (error.code) {
            case "ENOENT":
              return new FsFileNotFoundError({ path })
            case "EISDIR":
              return new FsFileIsADirError({ path })
          }
        }

        return new FsOtherError({ cause: error })
      },
    })
  }

  writeFile(path: AbsolutePath, contents: string): Effect.Effect<void, FsFileWriteError> {
    return Effect.tryPromise({
      try: () => writeFile(path.path, contents, "utf8"),
      catch: (error): FsFileWriteError => {
        if (error instanceof Error && "code" in error) {
          switch (error.code) {
            case "EISDIR":
              return new FsFileIsADirError({ path })
            case "ENOENT":
              return new FsParentNotFoundError({ path })
          }
        }

        return new FsOtherError({ cause: error })
      },
    })
  }

  exists(path: AbsolutePath): Effect.Effect<boolean> {
    return Effect.promise(async () => {
      try {
        await access(path.path)

        return true
      } catch {
        return false
      }
    })
  }

  get(path: AbsolutePath): Effect.Effect<FileSystemEntry | undefined> {
    return Effect.promise(async () => {
      try {
        const stats = await stat(path.path)
        if (stats.isFile()) {
          return { type: "file" as const, path }
        }
        if (stats.isDirectory()) {
          return { type: "dir" as const, path }
        }
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
          return undefined
        }
        throw error
      }
    })
  }

  listDir(path: AbsolutePath): Effect.Effect<FileSystemEntry[], FsDirAccessError> {
    return Effect.gen({ self: this }, function* () {
      const entry = yield* this.get(path)

      if (entry === undefined) {
        return yield* Effect.fail(new FsDirNotFoundError({ path }))
      }
      if (entry.type === "file") {
        return yield* Effect.fail(new FsNotADirError({ path }))
      }

      const entries = yield* Effect.promise(() => readdir(path.path, { withFileTypes: true }))

      return entries.map((dirent): FileSystemEntry => {
        const entryPath = path.join(dirent.name)
        if (dirent.isDirectory()) {
          return { type: "dir", path: entryPath }
        }

        return { type: "file", path: entryPath }
      })
    })
  }

  createDir(
    path: AbsolutePath,
    options: { recursive: boolean } = { recursive: true },
  ): Effect.Effect<void, FsDirCreateError> {
    return Effect.tryPromise({
      try: () => mkdir(path.path, { recursive: options.recursive }),
      catch: (error): FsDirCreateError => {
        if (error instanceof Error && "code" in error) {
          switch (error.code) {
            case "EEXIST":
              return new FsAlreadyExistsError({ path })
            case "ENOENT":
              return new FsParentNotFoundError({ path })
          }
        }

        return new FsOtherError({ cause: error })
      },
    }).pipe(Effect.asVoid)
  }

  removeDir(
    path: AbsolutePath,
    options: { recursive: true; force: true },
  ): Effect.Effect<void, never>
  removeDir(
    path: AbsolutePath,
    options: { recursive: true; force: false },
  ): Effect.Effect<void, FsDirAccessError>
  removeDir(
    path: AbsolutePath,
    options: { recursive: false; force: true },
  ): Effect.Effect<void, FsDirNotEmptyError | FsNotADirError>
  removeDir(
    path: AbsolutePath,
    options: { recursive: false; force: false },
  ): Effect.Effect<void, FsDirRemoveError>
  removeDir(
    path: AbsolutePath,
    options: { recursive: boolean; force: boolean },
  ): Effect.Effect<void, FsDirRemoveError> {
    return Effect.tryPromise({
      try: async () => {
        if (options.recursive) {
          await rm(path.path, { recursive: true, force: options.force })
        } else {
          await rmdir(path.path)
        }
      },
      catch: (error): FsDirRemoveError => {
        if (error instanceof Error && "code" in error) {
          switch (error.code) {
            case "EEXIST":
            case "ENOTEMPTY":
              return new FsDirNotEmptyError({ path })
            case "ENOENT":
              return new FsDirNotFoundError({ path })
            case "ENOTDIR":
              return new FsNotADirError({ path })
          }
        }
        throw error
      },
    }).pipe(
      Effect.catchTag("FsDirNotFoundError", (err) =>
        options.force ? Effect.void : Effect.fail(err),
      ),
    )
  }
}
