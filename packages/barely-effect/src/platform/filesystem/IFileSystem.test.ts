import { afterEach, describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as path from "node:path"

import { AbsolutePath } from "./AbsolutePath"
import { FileSystem } from "./FileSystem"
import {
  FsAlreadyExistsError,
  FsDirNotEmptyError,
  FsDirNotFoundError,
  FsFileIsADirError,
  FsFileNotFoundError,
  FsNotADirError,
  FsParentNotFoundError,
  type IFileSystem,
} from "./IFileSystem"
import { MemoryFileSystem } from "./MemoryFileSystem"

interface TestContext {
  fs: IFileSystem
  getTempDir: () => Promise<AbsolutePath>
  cleanup: () => Promise<void>
}

function memoryFsContext(): TestContext {
  let counter = 0
  const mfs = new MemoryFileSystem()

  return {
    fs: mfs,
    getTempDir: async () => {
      const dir = AbsolutePath(`/test-${counter++}`)
      await Effect.runPromise(mfs.createDir(dir, { recursive: true }))

      return dir
    },
    cleanup: async () => {},
  }
}

function nodeFsContext(): TestContext {
  const tempDirs: string[] = []

  return {
    fs: new FileSystem(),
    getTempDir: async () => {
      const dir = await mkdtemp(path.join(tmpdir(), "sun-valley-test-"))
      tempDirs.push(dir)

      return AbsolutePath(dir)
    },
    cleanup: async () => {
      for (const dir of tempDirs) {
        await rm(dir, { recursive: true, force: true })
      }
      tempDirs.length = 0
    },
  }
}

const contexts: Array<{ name: string; create: () => TestContext }> = [
  { name: MemoryFileSystem.name, create: memoryFsContext },
  { name: FileSystem.name, create: nodeFsContext },
]

for (const { name, create } of contexts) {
  describe(name, () => {
    const ctx = create()

    afterEach(async () => {
      await ctx.cleanup()
    })

    describe(FileSystem.prototype.readFile.name, () => {
      test("reads file contents", async () => {
        const dir = await ctx.getTempDir()
        const filePath = dir.join("notes.txt")
        await Effect.runPromise(ctx.fs.writeFile(filePath, "hello"))

        const contents = await Effect.runPromise(ctx.fs.readFile(filePath))

        expect(contents).toEqual("hello")
      })

      test("returns error when file does not exist", async () => {
        const dir = await ctx.getTempDir()
        const filePath = dir.join("missing.txt")

        const error = await Effect.runPromise(Effect.flip(ctx.fs.readFile(filePath)))

        expect(error).toEqual(new FsFileNotFoundError({ path: filePath }))
      })

      test("returns error when file is a directory", async () => {
        const dir = await ctx.getTempDir()

        const error = await Effect.runPromise(Effect.flip(ctx.fs.readFile(dir)))

        expect(error).toEqual(new FsFileIsADirError({ path: dir }))
      })
    })

    describe(FileSystem.prototype.writeFile.name, () => {
      test("writes file contents", async () => {
        const dir = await ctx.getTempDir()
        const filePath = dir.join("notes.txt")

        await Effect.runPromise(ctx.fs.writeFile(filePath, "hello"))

        expect(await Effect.runPromise(ctx.fs.readFile(filePath))).toEqual("hello")
      })

      test("overwrites existing contents", async () => {
        const dir = await ctx.getTempDir()
        const filePath = dir.join("notes.txt")
        await Effect.runPromise(ctx.fs.writeFile(filePath, "first"))

        await Effect.runPromise(ctx.fs.writeFile(filePath, "second"))

        expect(await Effect.runPromise(ctx.fs.readFile(filePath))).toEqual("second")
      })

      test("returns error when writing file to non-existing dir", async () => {
        const dir = await ctx.getTempDir()
        const filePath = dir.join("missing/notes.txt")

        const error = await Effect.runPromise(Effect.flip(ctx.fs.writeFile(filePath, "hello")))

        expect(error).toEqual(new FsParentNotFoundError({ path: filePath }))
      })
    })

    describe(FileSystem.prototype.exists.name, () => {
      test("returns true when path exists", async () => {
        const dir = await ctx.getTempDir()
        const filePath = dir.join("notes.txt")
        await Effect.runPromise(ctx.fs.writeFile(filePath, "hello"))

        expect(await Effect.runPromise(ctx.fs.exists(filePath))).toBeTrue()
      })

      test("returns false when path is missing", async () => {
        const dir = await ctx.getTempDir()
        const filePath = dir.join("missing.txt")

        expect(await Effect.runPromise(ctx.fs.exists(filePath))).toBeFalse()
      })
    })

    describe(FileSystem.prototype.createDir.name, () => {
      test("creates a directory when parent exists", async () => {
        const dir = (await ctx.getTempDir()).join("child")

        await Effect.runPromise(ctx.fs.createDir(dir, { recursive: false }))

        expect(await Effect.runPromise(ctx.fs.exists(dir))).toBeTrue()
      })

      test("creates nested directories when recursive", async () => {
        const dir = (await ctx.getTempDir()).join("parent/child")

        await Effect.runPromise(ctx.fs.createDir(dir, { recursive: true }))

        expect(await Effect.runPromise(ctx.fs.exists(dir))).toBeTrue()
      })

      test("creates nested directories by default", async () => {
        const dir = (await ctx.getTempDir()).join("parent/child")

        await Effect.runPromise(ctx.fs.createDir(dir))

        expect(await Effect.runPromise(ctx.fs.exists(dir))).toBeTrue()
      })

      test("returns error when parent is missing and not recursive", async () => {
        const dir = (await ctx.getTempDir()).join("parent/child")

        const error = await Effect.runPromise(
          Effect.flip(ctx.fs.createDir(dir, { recursive: false })),
        )

        expect(error).toEqual(new FsParentNotFoundError({ path: dir }))
      })

      test("returns error when directory already exists and not recursive", async () => {
        const dir = (await ctx.getTempDir()).join("child")
        await Effect.runPromise(ctx.fs.createDir(dir, { recursive: false }))

        const error = await Effect.runPromise(
          Effect.flip(ctx.fs.createDir(dir, { recursive: false })),
        )

        expect(error).toEqual(new FsAlreadyExistsError({ path: dir }))
      })

      test("succeeds when directory already exists and recursive", async () => {
        const dir = (await ctx.getTempDir()).join("child")
        await Effect.runPromise(ctx.fs.createDir(dir, { recursive: false }))

        await Effect.runPromise(ctx.fs.createDir(dir, { recursive: true }))
      })
    })

    describe(FileSystem.prototype.removeDir.name, () => {
      test("removes an empty directory", async () => {
        const tmp = await ctx.getTempDir()
        const dir = tmp.join("child")
        await Effect.runPromise(ctx.fs.createDir(dir, { recursive: false }))

        await Effect.runPromise(ctx.fs.removeDir(dir, { recursive: false, force: false }))

        expect(await Effect.runPromise(ctx.fs.exists(dir))).toBeFalse()
      })

      test("removes directories recursively", async () => {
        const tmp = await ctx.getTempDir()
        const dir = tmp.join("parent/child")
        await Effect.runPromise(ctx.fs.createDir(dir, { recursive: true }))
        await Effect.runPromise(ctx.fs.writeFile(dir.join("note.txt"), "hello"))

        await Effect.runPromise(
          ctx.fs.removeDir(tmp.join("parent"), { recursive: true, force: false }),
        )

        expect(await Effect.runPromise(ctx.fs.exists(dir))).toBeFalse()
      })

      test("returns error when removing non-empty directory without recursive", async () => {
        const tmp = await ctx.getTempDir()
        const dir = tmp.join("parent")
        await Effect.runPromise(ctx.fs.createDir(dir, { recursive: false }))
        await Effect.runPromise(ctx.fs.writeFile(dir.join("note.txt"), "hello"))

        const error = await Effect.runPromise(
          Effect.flip(ctx.fs.removeDir(dir, { recursive: false, force: false })),
        )

        expect(error).toEqual(new FsDirNotEmptyError({ path: dir }))
      })

      test("returns error when directory is missing and force is false", async () => {
        const tmp = await ctx.getTempDir()
        const dir = tmp.join("parent")

        const error = await Effect.runPromise(
          Effect.flip(ctx.fs.removeDir(dir, { recursive: false, force: false })),
        )

        expect(error).toEqual(new FsDirNotFoundError({ path: dir }))
      })

      test("returns error when not a directory and recursive is false", async () => {
        const tmp = await ctx.getTempDir()
        const filePath = tmp.join("file.txt")
        await Effect.runPromise(ctx.fs.writeFile(filePath, "hello world!"))

        const error = await Effect.runPromise(
          Effect.flip(ctx.fs.removeDir(filePath, { recursive: false, force: false })),
        )

        expect(error).toEqual(new FsNotADirError({ path: filePath }))
      })

      test("succeeds when removing file with recursive and force", async () => {
        const tmp = await ctx.getTempDir()
        const filePath = tmp.join("file.txt")
        await Effect.runPromise(ctx.fs.writeFile(filePath, "hello world!"))

        await Effect.runPromise(ctx.fs.removeDir(filePath, { recursive: true, force: true }))

        expect(await Effect.runPromise(ctx.fs.exists(filePath))).toBeFalse()
      })

      test("succeeds when directory is missing and force is true", async () => {
        const tmp = await ctx.getTempDir()
        const dir = tmp.join("missing")

        await Effect.runPromise(ctx.fs.removeDir(dir, { recursive: false, force: true }))
      })
    })

    describe(FileSystem.prototype.get.name, () => {
      test("gets existing file", async () => {
        const dir = await ctx.getTempDir()
        const filePath = dir.join("notes.txt")
        await Effect.runPromise(ctx.fs.writeFile(filePath, "hello"))

        expect(await Effect.runPromise(ctx.fs.get(filePath))).toEqual({
          type: "file",
          path: filePath,
        })
      })

      test("gets existing dir", async () => {
        const dir = await ctx.getTempDir()

        expect(await Effect.runPromise(ctx.fs.get(dir))).toEqual({ type: "dir", path: dir })
      })

      test("returns undefined for not existing", async () => {
        const dir = await ctx.getTempDir()

        expect(await Effect.runPromise(ctx.fs.get(dir.join("/not-existing")))).toEqual(undefined)
      })
    })

    describe(FileSystem.prototype.listDir.name, () => {
      test("lists non empty dir", async () => {
        const dir = await ctx.getTempDir()
        const notesFilePath = dir.join("notes.txt")
        await Effect.runPromise(ctx.fs.writeFile(notesFilePath, "hello"))
        const secretDirPath = dir.join("secret")
        await Effect.runPromise(ctx.fs.createDir(secretDirPath, { recursive: false }))
        const secretFilePath = secretDirPath.join("secret-notes.txt")
        await Effect.runPromise(ctx.fs.writeFile(secretFilePath, "goodbye"))

        const result = await Effect.runPromise(ctx.fs.listDir(dir))

        expect(result).toEqual([
          { type: "file", path: notesFilePath },
          { type: "dir", path: secretDirPath },
        ])
      })

      test("lists empty dir", async () => {
        const dir = await ctx.getTempDir()

        expect(await Effect.runPromise(ctx.fs.listDir(dir))).toEqual([])
      })

      test("returns error when listing not-existing dir", async () => {
        const dir = await ctx.getTempDir()
        const missingPath = dir.join("/not-existing")

        const error = await Effect.runPromise(Effect.flip(ctx.fs.listDir(missingPath)))

        expect(error).toEqual(new FsDirNotFoundError({ path: missingPath }))
      })

      test("returns error when listing file not dir", async () => {
        const dir = await ctx.getTempDir()
        const filePath = dir.join("file.txt")
        await Effect.runPromise(ctx.fs.writeFile(filePath, "hello world!"))

        const error = await Effect.runPromise(Effect.flip(ctx.fs.listDir(filePath)))

        expect(error).toEqual(new FsNotADirError({ path: filePath }))
      })
    })
  })
}
