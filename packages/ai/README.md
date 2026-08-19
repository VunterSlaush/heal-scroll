# @heal-scroll/ai

On-device AI capability layer: resolves which embedder / text generator this
device offers and adapts them to the core ports. Full design: root
`AI_ON_DEVICE_PLAN.md`.

## Invariants

- Depends **only** on `@heal-scroll/core` (+ zod). No react/expo/native imports
  here — enforced by ESLint. Native surfaces arrive as injected
  `NativeAiBindings`, built exclusively in `apps/mobile/src/composition-root.ts`.
- UI never imports this package; core use-cases receive ports, never providers.
- Generated text is decoration only. Card title/body/source are never generated.
- Nothing blocks on AI: every path degrades generator → embeddings → rules.
  `Embedder.embed` and `TextGenerator.generate` never reject.

## Capability modes

| Platform / condition                       | Embedder                      | Generator             | Mode              |
|--------------------------------------------|-------------------------------|-----------------------|-------------------|
| iOS 17+ (NL assets available)              | Apple NL (512-d, 0 MB)        | Foundation (iOS 26+)  | System AI / Local |
| iOS 17+ NL assets failed, MiniLM ready     | MiniLM ExecuTorch (384-d)     | Foundation (iOS 26+)  | System AI / Local |
| Android, MiniLM downloaded (~23 MB, wifi)  | MiniLM ExecuTorch (384-d)     | ML Kit Nano (flagged) | System AI / Local |
| No model / download declined               | noop (zero vectors)           | none                  | Rules only        |

`detectAiCapabilities(bindings)` is pure and sync; the async, fallible platform
probing happens in the composition root when it builds the bindings. Re-detect
on app foreground, download completion, and model deletion.

## Adding a provider

1. Add the raw surface to `capabilities/native-bindings.ts` (plain
   `number[][]`/`string` signatures — keep native types out).
2. `embedders/<name>.embedder.ts` or `generators/<name>.generator.ts`: a
   `create<Name>…(binding)` factory wrapping `wrapNativeEmbedder` /
   `wrapNativeGenerator` with a **stable, versioned id** (it tags stored
   vectors — changing it invalidates them).
3. Slot it into the priority ladder in `capabilities/detect.ts` and extend
   `detect.test.ts`'s matrix.
4. Build the actual native binding in the composition root, gated on its
   platform probe.
5. Providers stay thin (< ~40 lines); test with fake bindings, never a real
   model or the network.
