import { Data, type Effect } from "effect"

import { type AbsolutePath } from "./AbsolutePath"

// --- Error types ---

export class FsFileNotFoundError extends Data.TaggedError("FsFileNotFoundError")<{
  readonly path: AbsolutePath
}> {}
export class FsFileIsADirError extends Data.TaggedError("FsFileIsADirError")<{
  readonly path: AbsolutePath
}> {}
export class FsOtherError extends Data.TaggedError("FsOtherError")<{ readonly cause: unknown }> {}
export class FsParentNotFoundError extends Data.TaggedError("FsParentNotFoundError")<{
  readonly path: AbsolutePath
}> {}
export class FsDirNotFoundError extends Data.TaggedError("FsDirNotFoundError")<{
  readonly path: AbsolutePath
}> {}
export class FsNotADirError extends Data.TaggedError("FsNotADirError")<{
  readonly path: AbsolutePath
}> {}
export class FsDirNotEmptyError extends Data.TaggedError("FsDirNotEmptyError")<{
  readonly path: AbsolutePath
}> {}
export class FsAlreadyExistsError extends Data.TaggedError("FsAlreadyExistsError")<{
  readonly path: AbsolutePath
}> {}

// --- Union error types ---

export type FsFileAccessError = FsFileNotFoundError | FsFileIsADirError | FsOtherError
export type FsFileWriteError = FsFileIsADirError | FsParentNotFoundError | FsOtherError
export type FsDirAccessError = FsDirNotFoundError | FsNotADirError
export type FsDirRemoveError = FsDirAccessError | FsDirNotEmptyError
export type FsDirCreateError = FsParentNotFoundError | FsAlreadyExistsError | FsOtherError

// --- Entry type ---

export type FileSystemEntry =
  | { type: "file"; path: AbsolutePath }
  | { type: "dir"; path: AbsolutePath }

// --- Interface ---

export interface IFileSystem {
  readFile(path: AbsolutePath): Effect.Effect<string, FsFileAccessError>
  writeFile(path: AbsolutePath, contents: string): Effect.Effect<void, FsFileWriteError>

  createDir(
    path: AbsolutePath,
    options?: { recursive: boolean },
  ): Effect.Effect<void, FsDirCreateError>
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
  listDir(path: AbsolutePath): Effect.Effect<FileSystemEntry[], FsDirAccessError>

  get(path: AbsolutePath): Effect.Effect<FileSystemEntry | undefined>
  exists(path: AbsolutePath): Effect.Effect<boolean>
}
