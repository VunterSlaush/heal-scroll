# mobile

Expo Router app (SDK 57, New Architecture, TypeScript strict). Versioned Expo
docs: https://docs.expo.dev/versions/v57.0.0/

## Run

```
pnpm install                 # at the repo root
pnpm --filter mobile start   # dev server — scan the QR with Expo Go
pnpm --filter mobile exec expo run:android   # or a native dev build
```

Optional: put `EXPO_PUBLIC_NASA_API_KEY=...` in `apps/mobile/.env` to lift
NASA APOD's DEMO_KEY rate limit.

## Structure

- `src/app/` — tabs: `index` (Feed/session), `saved` (saves, collections, export),
  `stats` (insights + badges), `settings` (session size, cooldown, topics, sources).
  `_layout.tsx` runs DB migrations and registers the background refill task.
- `src/composition-root.ts` — the ONLY file importing `@heal-scroll/sources`
  and the expo-sqlite driver; wires adapters → repos → use-cases, image
  prefetching, and the shared refill trigger.
- `src/hooks/use-session.ts` — the session state machine
  (loading → active → ended → locked) plus save/vote/recall actions.
- `src/components/` — card, recall card, locked view, session end screen.
- `src/background/background-refill.ts` — expo-background-task registration.

## Invariants

- Screens/hooks import from `@heal-scroll/core` and `composition-root` only —
  never from `@heal-scroll/sources` directly.
- `babel.config.js` + `metro.config.js` include the `.sql` inline-import setup
  drizzle migrations need; don't remove it.
- No engagement mechanics: no notifications, no streaks, no variable rewards
  (PLAN §2d anti-patterns). The lock is soft but never bypassed by UI.
- No tests here — logic lives in the packages, which are tested.
