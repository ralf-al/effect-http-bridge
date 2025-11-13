# effect-http-bridge

Type-safe HTTP client for [Effect HTTP APIs](https://github.com/Effect-TS/effect/blob/main/packages/platform/README.md) with tRPC-like ergonomics. Server-side focused, returns `Promise<Result<A, E>>` for clean async/await usage in React Server Components, server actions, and other async contexts.

## Why?

Effect's HTTP API is powerful but requires Effect runtime knowledge. This library bridges that gap:

- 🎯 **tRPC-like DX**: `client.group.endpoint(params)` - fully typed
- 🔄 **Promise-based**: Works with `async/await` - no Effect runtime needed
- 🎨 **Type-safe errors**: Pattern match on specific error types
- 💎 **Errors as values**: No exceptions thrown, all errors are explicit in the type system
- ⚡ **Server-first**: Perfect for Next.js Server Components & Actions
- 📦 **Tiny**: Minimal wrapper around Effect Platform

## Installation

```bash
# npm
npm install effect-http-bridge

# pnpm
pnpm add effect-http-bridge

# bun
bun add effect-http-bridge
```

## Quick Start

### 1. Define Your API

First, define your Effect HTTP API using `@effect/platform`:

```typescript
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";

class Api extends HttpApi.make("api").add(
  HttpApiGroup.make("counter")
    .add(HttpApiEndpoint.get("count", "/count").addSuccess(Schema.Number))
    .add(HttpApiEndpoint.post("increment", "/increment"))
) {}
```

### 2. Create Your Client

Use `HttpBridge.Tag` to create a typed client with automatic setup:

```typescript
import { HttpBridge } from "effect-http-bridge";
import { FetchHttpClient } from "@effect/platform";
import { Api } from "./api";

export class CountClient extends HttpBridge.Tag<CountClient>()("CountClient", {
  api: Api,
  httpClient: FetchHttpClient.layer,
  baseUrl: "http://localhost:3000",
}) {}
```

### 3. Use It Anywhere

The client works with `async/await` and returns `Promise<Result<A, E>>`:

```typescript
// In a React Server Component
const result = await CountClient.query("counter", "count", {});

// In a Server Action
const result = await CountClient.mutation("counter", "increment")({});
```

## Usage Examples

### React Server Components

Use `Result.builder()` for type-safe pattern matching in your UI:

```typescript
import { Result } from "effect-http-bridge"
import { CountClient } from "./client"

export default async function Page() {
  const result = await CountClient.query("counter", "count", {})

  return (
    <div>
      {Result.builder(result)
        .onSuccess((value, success) => (
          <div>
            <p>Count: {value}</p>
            <p className="text-xs text-gray-400">
              Updated: {new Date(success.timestamp).toISOString()}
            </p>
          </div>
        ))
        .onErrorTag("RequestError", (error) => (
          <div className="text-red-600">
            Network error: Could not connect to server
          </div>
        ))
        .onErrorTag("ResponseError", (error) => (
          <div className="text-red-600">
            Server error: {error.message}
          </div>
        ))
        .onDefect((defect) => (
          <div className="text-red-600">
            Unexpected error: {String(defect)}
          </div>
        ))
        .orElse(() => (
          <div className="text-red-600">Unknown error</div>
        ))}
    </div>
  )
}
```

### Server Actions

Multiple patterns for handling results in server actions:

#### Pattern 1: Type Guards (Simplest)

```typescript
"use server";

import { Result } from "effect-http-bridge";
import { Cause } from "effect";
import { CountClient } from "./client";

export async function incrementCounter() {
  const result = await CountClient.mutation("counter", "increment")({});

  if (Result.isFailure(result)) {
    return {
      success: false,
      error: Cause.pretty(result.cause),
    };
  }

  return {
    success: true,
    data: result.value,
  };
}
```

#### Pattern 2: Result.match() for Control Flow

```typescript
"use server";

import { Result } from "effect-http-bridge";
import { Cause } from "effect";
import { CountClient } from "./client";

export async function getCount() {
  const result = await CountClient.query("counter", "count", {});

  return Result.match(result, {
    onSuccess: (s) => ({
      success: true as const,
      data: s.value,
    }),
    onFailure: (f) => ({
      success: false as const,
      error: Cause.pretty(f.cause),
    }),
  });
}
```

#### Pattern 3: Result.builder() for Specific Errors

```typescript
"use server";

import { Result } from "effect-http-bridge";
import { CountClient } from "./client";

export async function deleteUser(userId: string) {
  const result = await CountClient.mutation(
    "users",
    "delete"
  )({
    path: { id: userId },
  });

  return Result.builder(result)
    .onSuccess((value) => ({
      success: true as const,
      message: "User deleted successfully",
      data: value,
    }))
    .onErrorTag("NotFound", (error) => ({
      success: false as const,
      error: "User not found",
      code: "NOT_FOUND",
    }))
    .onErrorTag("Unauthorized", (error) => ({
      success: false as const,
      error: "You don't have permission to delete this user",
      code: "UNAUTHORIZED",
    }))
    .onError((error) => ({
      success: false as const,
      error: "Failed to delete user",
      code: "UNKNOWN_ERROR",
    }))
    .orElse(() => ({
      success: false as const,
      error: "An unexpected error occurred",
      code: "UNEXPECTED",
    }));
}
```

#### Pattern 4: Extract Value or Throw

```typescript
"use server";

import { Result } from "effect-http-bridge";
import { CountClient } from "./client";

export async function getCountOrThrow() {
  const result = await CountClient.query("counter", "count", {});

  // Throws if failure, returns value if success
  return Result.getOrThrow(result);
}
```

#### Pattern 5: Extract Value with Default

```typescript
"use server";

import { Result } from "effect-http-bridge";
import { CountClient } from "./client";

export async function getCountWithDefault() {
  const result = await CountClient.query("counter", "count", {});

  // Returns default if failure
  return Result.getOrElse(result, () => 0);
}
```

## API Reference

### HttpBridge.Tag

Creates a typed client from your Effect HTTP API definition.

```typescript
class YourClient extends HttpBridge.Tag<YourClient>()("YourClient", {
  api: YourApi, // Your HttpApi definition
  httpClient: FetchHttpClient.layer, // HTTP client layer
  baseUrl: "http://localhost:3000", // Base URL for requests
}) {}
```

### Client Methods

- **`query(group, endpoint, params)`**: Make a GET request
- **`mutation(group, endpoint)`**: Returns a function for POST/PUT/DELETE requests

### Result Type

```typescript
type Result<A, E> = Success<A, E> | Failure<A, E>;

interface Success<A, E> {
  _tag: "Success";
  value: A;
  timestamp: number;
}

interface Failure<A, E> {
  _tag: "Failure";
  cause: Cause.Cause<E>;
}
```

### Result Utilities

- **`Result.builder(result)`**: Fluent API for pattern matching
  - `.onSuccess((value, success) => T)`: Handle success case
  - `.onErrorTag(tag, (error) => T)`: Handle specific error types
  - `.onErrorTag([tag1, tag2], (error) => T)`: Handle multiple error types
  - `.onError((cause) => T)`: Handle any error
  - `.onDefect((defect, failure) => T)`: Handle unexpected errors
  - `.orElse(() => T)`: Fallback handler
- **`Result.match(result, { onSuccess, onFailure })`**: Simple pattern matching
- **`Result.isSuccess(result)`**: Type guard for success
- **`Result.isFailure(result)`**: Type guard for failure
- **`Result.getOrThrow(result)`**: Extract value or throw
- **`Result.getOrElse(result, fallback)`**: Extract value or use default

## TypeScript Support

Full type inference for:

- Request parameters (path, query, payload)
- Success values
- Error types (tagged unions)
- Pattern matching exhaustiveness

## License

MIT
