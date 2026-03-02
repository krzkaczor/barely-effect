import { describe, expect, it } from "bun:test"
import { Effect } from "effect"

import { AbsolutePath, MemoryFileSystem } from "../src/platform/filesystem"
import { fixImportsInDirectory } from "./fix-imports"

describe(fixImportsInDirectory.name, () => {
  it("adds .js extensions to relative imports and /index.js for directories", async () => {
    const fs = new MemoryFileSystem({
      dist: {
        "index.js": `import { foo } from "./utils"
import { bar } from "./already.js"
import data from "./data.json"`,
        "utils.js": "export const foo = 1",
        "already.js": "export const bar = 2",
        "data.json": "{}",
        models: {
          "index.js": "export const Model = {}",
        },
        "consumer.js": `import { Model } from "./models"`,
      },
    })

    await Effect.runPromise(fixImportsInDirectory(AbsolutePath("/dist"), fs))

    expect(await Effect.runPromise(fs.readFile(AbsolutePath("/dist/index.js")))).toEqual(
      `import { foo } from "./utils.js"
import { bar } from "./already.js"
import data from "./data.json"`,
    )
    expect(await Effect.runPromise(fs.readFile(AbsolutePath("/dist/consumer.js")))).toEqual(
      `import { Model } from "./models/index.js"`,
    )
  })
})
