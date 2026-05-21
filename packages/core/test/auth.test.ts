import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { EventV2 } from "@opencode-ai/core/event"
import { AppFileSystem } from "@opencode-ai/core/filesystem"
import { Global } from "@opencode-ai/core/global"
import { AccountV2 as AuthV2 } from "@opencode-ai/core/account"
import { tmpdir } from "./fixture/tmpdir"
import { testEffect } from "./lib/effect"

const it = testEffect(Layer.empty)

describe("AuthV2", () => {
  it.live("stores api credentials", () =>
    Effect.gen(function* () {
      const tmp = yield* Effect.acquireRelease(
        Effect.promise(() => tmpdir()),
        (tmp) => Effect.promise(() => tmp[Symbol.asyncDispose]()),
      )

      const account = yield* Effect.gen(function* () {
        const auth = yield* AuthV2.Service
        return yield* auth.create({
          serviceID: AuthV2.ServiceID.make("anthropic"),
          credential: new AuthV2.ApiKeyCredential({ type: "api", key: "sk-test" }),
        })
      }).pipe(
        Effect.provide(AuthV2.layer),
        Effect.provide(EventV2.defaultLayer),
        Effect.provide(AppFileSystem.defaultLayer),
        Effect.provide(Global.layerWith({ data: tmp.path })),
      )
      expect(account).toBeDefined()
      if (!account) return

      const active = yield* Effect.gen(function* () {
        const auth = yield* AuthV2.Service
        return yield* auth.active(AuthV2.ServiceID.make("anthropic"))
      }).pipe(
        Effect.provide(AuthV2.layer),
        Effect.provide(EventV2.defaultLayer),
        Effect.provide(AppFileSystem.defaultLayer),
        Effect.provide(Global.layerWith({ data: tmp.path })),
      )

      expect(active?.id).toBe(account.id)
      expect(active?.credential).toEqual({ type: "api", key: "sk-test" })
    }),
  )
})
