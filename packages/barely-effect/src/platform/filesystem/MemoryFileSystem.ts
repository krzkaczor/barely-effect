import { Effect } from "effect"

import { AbsolutePath } from "./AbsolutePath"
import {
  FsAlreadyExistsError,
  FsDirNotEmptyError,
  FsDirNotFoundError,
  FsFileIsADirError,
  FsFileNotFoundError,
  FsNotADirError,
  FsParentNotFoundError,
  type FsDirAccessError,
  type FsDirCreateError,
  type FsDirRemoveError,
  type FsFileAccessError,
  type FsFileWriteError,
  type FileSystemEntry,
  type IFileSystem,
} from "./IFileSystem"
import { KeyedMap } from "./KeyedMap"

export type MemoryFileSystemGenesisState = { [path: string]: MemoryFileSystemGenesisState | string }

type Entry = { type: "file"; content: string } | { type: "dir" }

export class MemoryFileSystem implements IFileSystem {
  private readonly entries = new KeyedMap<AbsolutePath, Entry>((key) => key.path)
  private readonly root = AbsolutePath("/")

  constructor(genesis: MemoryFileSystemGenesisState = {}) {
    this.entries.set(this.root, { type: "dir" })
    this.seedFromGenesis(AbsolutePath("/"), genesis)
  }

  readFile(path: AbsolutePath): Effect.Effect<string, FsFileAccessError> {
    return Effect.gen({ self: this }, function* () {
      const entry = this.entries.get(path)

      if (entry?.type === "dir") {
        return yield* Effect.fail(new FsFileIsADirError({ path }))
      }
      if (!entry) {
        return yield* Effect.fail(new FsFileNotFoundError({ path }))
      }

      return entry.content
    })
  }

  writeFile(path: AbsolutePath, contents: string): Effect.Effect<void, FsFileWriteError> {
    return Effect.gen({ self: this }, function* () {
      const parentPath = path.getDirPath()
      const parentEntry = this.entries.get(parentPath)

      if (!parentEntry) {
        return yield* Effect.fail(new FsParentNotFoundError({ path }))
      }

      const entry = this.entries.get(path)
      if (entry?.type === "dir") {
        return yield* Effect.fail(new FsFileIsADirError({ path }))
      }

      this.entries.set(path, { type: "file", content: contents })
    })
  }

  exists(path: AbsolutePath): Effect.Effect<boolean> {
    return Effect.gen({ self: this }, function* () {
      return (yield* this.get(path)) !== undefined
    })
  }

  createDir(
    dirPath: AbsolutePath,
    options: { recursive: boolean } = { recursive: true },
  ): Effect.Effect<void, FsDirCreateError> {
    return Effect.gen({ self: this }, function* () {
      const entry = this.entries.get(dirPath)

      if (entry?.type === "dir") {
        if (!options.recursive) {
          return yield* Effect.fail(new FsAlreadyExistsError({ path: dirPath }))
        }

        return
      }

      const parentPath = dirPath.getDirPath()
      if (!options.recursive && !this.entries.get(parentPath)) {
        return yield* Effect.fail(new FsParentNotFoundError({ path: dirPath }))
      }

      if (options.recursive) {
        let current = dirPath
        while (!this.entries.has(current)) {
          this.entries.set(current, { type: "dir" })
          const parent = current.getDirPath()
          if (parent.eq(current)) {
            break
          }
          current = parent
        }
      } else {
        this.entries.set(dirPath, { type: "dir" })
      }
    })
  }

  removeDir(
    dirPath: AbsolutePath,
    options: { recursive: true; force: true },
  ): Effect.Effect<void, never>
  removeDir(
    dirPath: AbsolutePath,
    options: { recursive: true; force: false },
  ): Effect.Effect<void, FsDirAccessError>
  removeDir(
    dirPath: AbsolutePath,
    options: { recursive: false; force: true },
  ): Effect.Effect<void, FsDirNotEmptyError | FsNotADirError>
  removeDir(
    dirPath: AbsolutePath,
    options: { recursive: false; force: false },
  ): Effect.Effect<void, FsDirRemoveError>
  removeDir(
    dirPath: AbsolutePath,
    options: { recursive: boolean; force: boolean },
  ): Effect.Effect<void, FsDirRemoveError> {
    return Effect.gen({ self: this }, function* () {
      const entry = this.entries.get(dirPath)

      if (entry?.type === "file") {
        if (options.recursive && options.force) {
          this.entries.delete(dirPath)

          return
        }

        return yield* Effect.fail(new FsNotADirError({ path: dirPath }))
      }

      if (!entry) {
        if (options.force) {
          return
        }

        return yield* Effect.fail(new FsDirNotFoundError({ path: dirPath }))
      }

      const hasChildren = this.hasEntriesWithin(dirPath)
      if (hasChildren && !options.recursive) {
        return yield* Effect.fail(new FsDirNotEmptyError({ path: dirPath }))
      }

      if (options.recursive) {
        this.removeDirectoryRecursive(dirPath)
      } else {
        this.entries.delete(dirPath)
      }
    })
  }

  listDir(path: AbsolutePath): Effect.Effect<FileSystemEntry[], FsDirAccessError> {
    return Effect.gen({ self: this }, function* () {
      const entry = this.entries.get(path)

      if (entry?.type === "file") {
        return yield* Effect.fail(new FsNotADirError({ path }))
      }
      if (!entry) {
        return yield* Effect.fail(new FsDirNotFoundError({ path }))
      }

      return this.getDirectChildren(path)
    })
  }

  get(path: AbsolutePath): Effect.Effect<FileSystemEntry | undefined> {
    return Effect.sync(() => {
      const entry = this.entries.get(path)

      if (!entry) {
        return undefined
      }

      return { type: entry.type, path }
    })
  }

  private seedFromGenesis(cwd: AbsolutePath, genesis: MemoryFileSystemGenesisState): void {
    for (const [key, value] of Object.entries(genesis)) {
      const path = cwd.join(key)
      if (typeof value === "string") {
        this.createDirectorySync(path.getDirPath(), { recursive: true })
        this.writeFileSync(path, value)
      } else {
        this.createDirectorySync(path, { recursive: true })
        this.seedFromGenesis(path, value)
      }
    }
  }

  private writeFileSync(path: AbsolutePath, contents: string): void {
    const parentPath = path.getDirPath()
    const parentEntry = this.entries.get(parentPath)
    if (!parentEntry) {
      throw new Error(`Parent directory not found: ${parentPath.path}`)
    }

    const entry = this.entries.get(path)
    if (entry?.type === "dir") {
      throw new Error(`Path is a directory: ${path.path}`)
    }

    this.entries.set(path, { type: "file", content: contents })
  }

  private createDirectorySync(dirPath: AbsolutePath, options: { recursive: boolean }): void {
    const entry = this.entries.get(dirPath)
    if (entry?.type === "dir") {
      if (!options.recursive) {
        throw new Error(`Directory already exists: ${dirPath.path}`)
      }

      return
    }

    if (options.recursive) {
      let current = dirPath
      while (!this.entries.has(current)) {
        this.entries.set(current, { type: "dir" })
        const parent = current.getDirPath()
        if (parent.eq(current)) {
          break
        }
        current = parent
      }
    } else {
      this.entries.set(dirPath, { type: "dir" })
    }
  }

  private getDirectChildren(dir: AbsolutePath): FileSystemEntry[] {
    const files: FileSystemEntry[] = []
    const dirs: FileSystemEntry[] = []

    for (const [path, entry] of this.entries) {
      if (path.getDirPath().eq(dir) && !path.eq(dir)) {
        if (entry.type === "file") {
          files.push({ type: "file", path })
        } else {
          dirs.push({ type: "dir", path })
        }
      }
    }

    return [...files, ...dirs]
  }

  private removeDirectoryRecursive(dir: AbsolutePath): void {
    for (const [path] of this.entries) {
      if (dir.contains(path)) {
        this.entries.delete(path)
      }
    }

    this.entries.set(this.root, { type: "dir" })
  }

  private hasEntriesWithin(dir: AbsolutePath): boolean {
    for (const [path] of this.entries) {
      if (dir.contains(path) && !path.eq(dir)) {
        return true
      }
    }

    return false
  }
}
