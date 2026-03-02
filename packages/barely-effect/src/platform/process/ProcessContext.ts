import * as os from "node:os"
import * as path from "node:path"

import { AbsolutePath } from "../filesystem/AbsolutePath"
import { EnvReader } from "./EnvReader"

export interface IProcessContext {
  readonly cwd: AbsolutePath
  readonly env: EnvReader
  readonly home: AbsolutePath

  pathFromCwd(inputPath: string): AbsolutePath
  resolvePath(inputPath: string): AbsolutePath
}

export abstract class AbstractProcessContext implements IProcessContext {
  abstract readonly cwd: AbsolutePath
  abstract readonly env: EnvReader
  abstract readonly home: AbsolutePath

  pathFromCwd(inputPath: string): AbsolutePath {
    return this.cwd.join(inputPath)
  }

  resolvePath(inputPath: string): AbsolutePath {
    if (inputPath === "") {
      throw new Error("Path cannot be empty")
    }

    if (path.isAbsolute(inputPath)) {
      return AbsolutePath(inputPath)
    }

    if (inputPath.startsWith("~")) {
      const pathAfterTilde = inputPath.slice(1)

      if (pathAfterTilde === "" || pathAfterTilde === "/") {
        return this.home
      }
      if (pathAfterTilde.startsWith("/")) {
        return this.home.join(pathAfterTilde)
      }
    }

    return this.cwd.join(inputPath)
  }
}

export class ProcessContext extends AbstractProcessContext {
  readonly home: AbsolutePath = new AbsolutePath(os.homedir())
  readonly cwd: AbsolutePath = new AbsolutePath(process.cwd())
  readonly env: EnvReader

  constructor() {
    super()
    this.env = new EnvReader(process.env as Record<string, string | undefined>)
  }
}

export interface InMemoryProcessContextOptions {
  cwd?: AbsolutePath
  home?: AbsolutePath
  env?: Record<string, string | undefined>
}

export class InMemoryProcessContext extends AbstractProcessContext {
  readonly home: AbsolutePath
  readonly cwd: AbsolutePath
  readonly env: EnvReader

  constructor(options?: InMemoryProcessContextOptions) {
    super()
    this.home = options?.home ?? AbsolutePath("/home")
    this.cwd = options?.cwd ?? AbsolutePath("/home/workspace")
    this.env = new EnvReader(options?.env ?? {})
  }
}
