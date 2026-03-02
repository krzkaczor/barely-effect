import * as pathModule from "node:path"

class AbsolutePathClazz {
  public readonly path: string

  constructor(absolutePath: string) {
    if (!pathModule.isAbsolute(absolutePath)) {
      throw new Error(`Path is not absolute, was: ${absolutePath}`)
    }
    this.path = pathModule.resolve(absolutePath)
  }

  getName(): string {
    return pathModule.basename(this.path)
  }

  getDirPath(): AbsolutePath {
    return AbsolutePath(pathModule.dirname(this.path))
  }

  join(...paths: Array<string>): AbsolutePath {
    return AbsolutePath(pathModule.join(this.path, ...paths))
  }

  relativeFrom(root: AbsolutePath): string {
    return pathModule.relative(root.path, this.path)
  }

  contains(other: AbsolutePath): boolean {
    const relative = pathModule.relative(this.path, other.path)
    if (relative === "") {
      return true
    }

    return !relative.startsWith("../") && relative !== ".." && !pathModule.isAbsolute(relative)
  }

  eq(other: AbsolutePath): boolean {
    return this.path === other.path
  }

  toString(): string {
    return this.path
  }
}

function AbsolutePathClass(absolutePath: string): AbsolutePathClazz {
  return new AbsolutePathClazz(absolutePath)
}

Object.setPrototypeOf(AbsolutePathClass, AbsolutePathClazz)
AbsolutePathClass.prototype = AbsolutePathClazz.prototype
export const AbsolutePath = Object.assign(AbsolutePathClass, AbsolutePathClazz) as unknown as {
  new (absolutePath: string): AbsolutePathClazz
  (absolutePath: string): AbsolutePathClazz
}
export type AbsolutePath = AbsolutePathClazz
