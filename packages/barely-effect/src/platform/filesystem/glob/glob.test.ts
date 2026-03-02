import { describe, expect, it } from "bun:test"
import { Effect } from "effect"
import { sort } from "remeda"

import type { FileSystemEntry } from "../IFileSystem"

import { AbsolutePath } from "../AbsolutePath"
import { MemoryFileSystem } from "../MemoryFileSystem"
import { glob } from "./glob"

describe(glob.name, () => {
  const fs = new MemoryFileSystem({
    "/proj": {
      lib: {
        "server.ts": "server file ",
        components: {
          "Home.tsx": "component file",
          "Button.jsx": "component file in js",
        },
      },
      "index.ts": "a typescript file",
      "README.md": "# file from in memory file system",
    },
    "/tmp": {
      "another-proj": {
        "index.ts": "index file",
        "CONTRIBUTING.md": "how to contribute to this repo",
      },
    },
    ".gitignore": "",
  })

  it("finds deeply nested entries", async () => {
    const results = await Effect.runPromise(
      glob({ cwd: AbsolutePath("/"), pattern: "**/*.ts" }, fs),
    )

    expect(sortByPath(results)).toEqual([
      { type: "file", path: AbsolutePath("/proj/index.ts") },
      { type: "file", path: AbsolutePath("/proj/lib/server.ts") },
      { type: "file", path: AbsolutePath("/tmp/another-proj/index.ts") },
    ])
  })

  it("finds all entry in directory", async () => {
    const results = await Effect.runPromise(
      glob({ cwd: AbsolutePath("/proj"), pattern: "lib/*" }, fs),
    )

    expect(sortByPath(results)).toEqual([
      { type: "dir", path: AbsolutePath("/proj/lib/components") },
      { type: "file", path: AbsolutePath("/proj/lib/server.ts") },
    ])
  })

  it("finds no entries for incorrect pattern", async () => {
    const results = await Effect.runPromise(
      glob(
        {
          cwd: AbsolutePath("/"),
          pattern: "lib/*", // /lib doesn't exist
        },
        fs,
      ),
    )

    expect(results).toEqual([])
  })

  it("finds all entries with '**'", async () => {
    const results = await Effect.runPromise(
      glob(
        {
          cwd: AbsolutePath("/"),
          pattern: "**",
        },
        fs,
      ),
    )

    expect(sortByPath(results)).toMatchSnapshot()
  })

  it("finds all entries with selected extensions", async () => {
    const results = await Effect.runPromise(
      glob(
        {
          cwd: AbsolutePath("/"),
          pattern: "**/*.{tsx, jsx}",
        },
        fs,
      ),
    )

    expect(sortByPath(results)).toEqual([
      { type: "file", path: AbsolutePath("/proj/lib/components/Button.jsx") },
      { type: "file", path: AbsolutePath("/proj/lib/components/Home.tsx") },
    ])
  })

  describe("option onlyFiles", () => {
    it("returns paths for files", async () => {
      const results = await Effect.runPromise(
        glob(
          {
            cwd: AbsolutePath("/"),
            onlyFiles: true,
            pattern: "**/*.tsx",
          },
          fs,
        ),
      )

      expect(results).toEqual([AbsolutePath("/proj/lib/components/Home.tsx")])
    })
  })

  it("should match files at the current directory level with globstar", async () => {
    const results = await Effect.runPromise(
      glob(
        {
          pattern: "**/*.ts",
          cwd: AbsolutePath("/tmp/another-proj"),
        },
        fs,
      ),
    )

    const paths = sortByPath(results).map((e) => e.path.path)

    expect(paths).toEqual(["/tmp/another-proj/index.ts"])
  })
})

function sortByPath(results: FileSystemEntry[]): FileSystemEntry[] {
  return sort(results, (a, b) => a.path.path.localeCompare(b.path.path))
}
