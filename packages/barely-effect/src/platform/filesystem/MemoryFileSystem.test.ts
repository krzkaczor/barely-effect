import { describe, expect, test } from "bun:test"
import { Effect } from "effect"

import { AbsolutePath } from "./AbsolutePath"
import { MemoryFileSystem } from "./MemoryFileSystem"

describe(MemoryFileSystem.name, () => {
  describe("constructor", () => {
    test("creates file system from genesis object", async () => {
      const mfs = new MemoryFileSystem({
        "dir-a": {
          "a.txt": "a text file",
        },
        "dir-b": {
          "dir-b-nested": {},
        },
      })

      expect(await Effect.runPromise(mfs.readFile(AbsolutePath("/dir-a/a.txt")))).toEqual(
        "a text file",
      )
      expect(await Effect.runPromise(mfs.get(AbsolutePath("/dir-b")))).toEqual({
        type: "dir",
        path: expect.anything(),
      })
      expect(await Effect.runPromise(mfs.get(AbsolutePath("/dir-b/dir-b-nested")))).toEqual({
        type: "dir",
        path: expect.anything(),
      })
    })
  })
})
