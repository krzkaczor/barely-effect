# Claude

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

- Follow the Arrange, Act, Assert (AAA) pattern with a blank line between each section. Do not add `// Arrange`, `// Act`, `// Assert` comments — the blank lines are sufficient.
- When naming `describe` blocks, prefer `SomeClass.name` and `SomeClass.prototype.method.name` instead of hardcoding string names.
- Instead of `await expect(promise).resolves.toEqual(...)`, use `expect(await promise).toEqual(...)`.

## Linting & Formatting

Always run `bun run fix` after introducing changes to auto-fix formatting and lint issues and execute tests.

## Effect

- Methods returning Effect should use `Effect.gen({ self: this }, function* () { ... })` to access `this` inside generators (avoid `const self = this` aliasing).
- Use newlines to improve readability inside generators and introduce blocks (`{ }`) around return statements.
- Prefer inlining `yield*` directly in expressions when the result is used only once (e.g. in object literals or function arguments):

  ```ts
  // good — inline yield*
  return {
    logLevel: yield * envReader.stringOf('LOG_LEVEL', LOG_LEVELS, 'INFO'),
  }

  // avoid — unnecessary variable
  const logLevel = yield * envReader.stringOf('LOG_LEVEL', LOG_LEVELS, 'INFO')
  return { logLevel }
  ```
