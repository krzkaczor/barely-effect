/**
 * A Map-like data structure that supports arbitrary keys via a serialization function.
 * This is useful when you want to use objects (like AbsolutePath) as map keys
 * while maintaining proper equality semantics.
 */
export class KeyedMap<K, V> {
  private readonly map = new Map<string, V>()
  private readonly keyMap = new Map<string, K>()

  constructor(private readonly serialize: (key: K) => string) {}

  get(key: K): V | undefined {
    return this.map.get(this.serialize(key))
  }

  set(key: K, value: V): this {
    const serialized = this.serialize(key)
    this.map.set(serialized, value)
    this.keyMap.set(serialized, key)
    return this
  }

  has(key: K): boolean {
    return this.map.has(this.serialize(key))
  }

  delete(key: K): boolean {
    const serialized = this.serialize(key)
    this.keyMap.delete(serialized)
    return this.map.delete(serialized)
  }

  clear(): void {
    this.map.clear()
    this.keyMap.clear()
  }

  get size(): number {
    return this.map.size
  }

  *keys(): IterableIterator<K> {
    for (const key of this.keyMap.values()) {
      yield key
    }
  }

  *values(): IterableIterator<V> {
    yield* this.map.values()
  }

  *entries(): IterableIterator<[K, V]> {
    for (const [serialized, value] of this.map.entries()) {
      const key = this.keyMap.get(serialized)!
      yield [key, value]
    }
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries()
  }

  forEach(callbackfn: (value: V, key: K, map: KeyedMap<K, V>) => void): void {
    for (const [key, value] of this.entries()) {
      callbackfn(value, key, this)
    }
  }
}
