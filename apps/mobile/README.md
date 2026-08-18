# mobile

Expo Router app (SDK 57, New Architecture, TypeScript strict). Versioned Expo
docs: https://docs.expo.dev/versions/v57.0.0/

## Run

```
pnpm install                 # at the repo root
pnpm --filter mobile start   # dev server — scan the QR with Expo Go
pnpm --filter mobile exec expo run:android   # or a native dev build
```

## Structure

- `src/app/` — Expo Router screens (`_layout.tsx` runs DB migrations, `index.tsx` is the Feed)
- `src/composition-root.ts` — the ONLY file importing `@heal-scroll/sources`
  and the expo-sqlite driver; wires adapter → repo → use-case
- `src/hooks/use-feed.ts` — session loading (cache first, live top-up when thin)
- `src/components/card-item.tsx` — card rendering

## Invariants

- Screens/hooks import from `@heal-scroll/core` and `composition-root` only —
  never from `@heal-scroll/sources` directly.
- `babel.config.js` + `metro.config.js` include the `.sql` inline-import setup
  drizzle migrations need; don't remove it.
- No tests here yet — logic lives in the packages, which are tested.
