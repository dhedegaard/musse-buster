# CLAUDE.md

## Commands

```bash
npm ci              # Install dependencies (always use ci, not install)
npx serve out       # Serve the production build (`npm run start` fails: next start doesn't support output: 'export')
```

Verify changes via `npm run lint`, `typecheck`, `format:check`, `test` and `build` (CI runs all five). Vitest only covers the save merge (`src/stores/persisted-state.test.ts`); everything else is checked in a browser. To smoke-test a build, serve `out/` (`npx serve out -l <port>`) and drive it in a browser: `n` starts a game, `↑` adds a row.
For before/after visual checks, seed `Math.random`/`crypto.randomUUID` and fake the clock, then diff computed styles as well as pixels. Bubble anti-aliasing and the progress bar differ between runs of the same build.
Use real key presses (Playwright `keyboard.press`) when testing input: script-dispatched `KeyboardEvent`s never activate a focused button.
To test persistence, write `{"state": {…}, "version": 0}` to localStorage key `musse-buster-v0`, reload, then press `n` and read the key back. Fields left out keep their initial values.
To test falls or pausing deterministically, seed a `running` save with `nextTickTime` far in the future (so no row arrives) and bubbles stacked so one click makes others fall, then click the hit rect with a real mouse click (`svg rect.cursor-pointer[x="…"][y="…"]`, where `y` is in SVG space: `13 - bubble.y`).
Bundle audit: `npx next analyze --output --snapshot <name>` then `npx next analyze export --snapshot <name> | gzip > <file>`. The client app chunk is triggered by `board.tsx`; zod is the largest app-owned dependency.

## Architecture

**Musse Buster** is a browser-based bubble-buster game (Next.js 16 App Router, React 19, static export via `output: 'export'`).

### State (`src/stores/game-store.ts`)

Single Zustand store (`useGameStore`) with `persist` middleware (localStorage key: `musse-buster-v0`), plus `devtools` in dev only via `withDevtools`, which is typed as identity so devtools-only API (`api.devtools`, `setState` action names) can't compile. zustand would otherwise enable devtools in production, since Next doesn't set `import.meta.env.MODE`. A custom `merge` (`mergePersistedState` in `src/stores/persisted-state.ts`) validates the save part by part and keeps what's valid: a missing field gets its initial value, the game in progress is kept or dropped as one unit, bad old games are dropped one by one, and unknown top-level keys and unknown fields on old games are kept for rolled-back builds (bubbles and `currentGame` lose theirs, since gameplay re-parses them). When it drops anything, the raw save is copied to `musse-buster-v0-backup` first. Adding a required field to `Game` or `Bubble` invalidates existing saves: fill it in for older saves in `mergePersistedState` (like `withLegacyBubbleType`); the era fixtures in `persisted-state.test.ts` fail until you do. Don't add a persist `version`: a rolled-back build seeing a newer version discards the whole save. Store actions orchestrate state mutations and delegate computation to `src/game-logic.ts` (pure, deterministic, no side effects). State machine: `'main-menu' | 'running' | 'paused' | 'game-over'`.

`oldGames` holds the best 1000 scored games, not the latest (`keepBestGames`, applied in `reset()` and on load). 0-score games are never saved or counted, and `totalGames` is a separate, uncapped count of scored games. zustand also calls `merge` with `undefined` on a first visit.

Key actions:

- `applyGravity()` — must be called manually after any removal (not automatic)
- `togglePause()` — preserves elapsed tick delta so resuming continues mid-interval

### Models (`src/models/`)

Zod schemas (imported from `zod/mini`) define both schema and TypeScript interface via `interface Foo extends z.infer<typeof Foo> {}`. Always use `.parse()` to construct objects (no field has a default; pass every field). Schemas that get `.parse()`d (`Bubble`, `Game`) are wrapped in `z.compile(...)` for a much faster parse, at about 9 KB gz of bundle cost; this needs zod ≥ 4.5, so keep the `^4.6.7` floor. `Color`/`BubbleType` are only checked inside `Bubble` and need no compile. Don't `z.compile` schemas parsed once (like the load-time ones in `persisted-state.ts`): compiling runs at startup and costs more than it saves. A compiled child such as `Bubble` keeps its fast path inside an uncompiled parent. Board is 10×14 (`BOARD_WIDTH` × `BOARD_HEIGHT`); y=0 is the bottom row — `BubbleCircle` flips to SVG space via `BOARD_HEIGHT - y - 1`. The `Bubble.animation` field drives CSS animations and must be set explicitly: `'spawning'` (new row), `'pushed-up'` (existing bubble shifted up), `'fall'` (gravity drop).

### UI (`src/app/`, `src/components/`)

- `board.tsx` — client component, `requestAnimationFrame` game loop, auto-pauses on tab hide, renders SVG grid
  - The keydown listener is deliberately non-passive: it calls `preventDefault()` on `CLAIMED_KEYS` so space doesn't also activate a focused button, and it ignores `event.repeat`.
- Layout is desktop-only: the board is `w-[60vh]` and the score/button panels sit outside it (`right-full`/`left-full`), so on a phone the board is clipped and the panels are off-screen.
- `bottom-bar.tsx` — tick-progress bar driven by `useGameStore.subscribe()` + Web Animations API directly, bypassing React's render cycle entirely; no re-renders on tick updates
- `bubble-circle.tsx` — uses a `deferredY` / `useEffect` one-frame delay so the SVG `<circle>` transitions from the old position to the new one (enabling CSS `transition` for `'fall'` animation); `calcTransitionDuration` scales by number of rows fallen; uses `cva` (class-variance-authority) for color/type variants
  - Pausing sets `data-paused` on the board wrapper (`group/board`); bubbles turn one gray and hide bombs via `group-data-paused/board:` classes. `.Circle` transitions only `cy`/`translate`: transitioning anything else lets colours fade visibly after a pause. The 💣 moves with CSS `translate`, since `<text>`'s `y` can't be transitioned. The board is mouse-only; hit rects are deliberately not focusable.
- All component selectors combine multiple fields into a single `useGameStore(useShallow((state) => ({ ... })))` call — never multiple separate `useGameStore` calls per component

### Patterns

- **Exhaustive switches**: Use `switch` with `default: assertNever(value)` for all union type branching (game state, bubble type). `assertNever` (from `src/utils.ts`) accepts `never` and throws a `TypeError` — this enforces exhaustive handling at compile time and runtime.
- **Logging**: `no-console` is `error`. A deliberate log needs `// eslint-disable-next-line no-console -- <reason>`.
- **Strict TypeScript**: The code style is explicit null checks (`x == null`), but no lint rule enforces strict boolean expressions.
- **Explicit types**: module constants get `as const`, and catch clauses are written `catch (error: unknown)`.
- **Zod imports**: Use `import * as z from 'zod/mini'` (wildcard import for correct tree-shaking).
- **Module-level constants**: Hoist stable event handlers and static values to module scope rather than using `useCallback(fn, [])` inside components. See `preventContextMenu`, `handleKeyDown`, `handleVisibilityChange` in `board.tsx`.
- **daisyUI**: `src/globals/styles.css` limits daisyUI via `include:` (internal names from `node_modules/daisyui/components/`, e.g. `button` not `btn`, plus the base styles `properties`, `rootcolor`, …). A new daisyUI component must be added there; `better-tailwindcss/no-unknown-classes` fails lint if it isn't.
