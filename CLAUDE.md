# CLAUDE.md

## Commands

```bash
npm ci              # Install dependencies (always use ci, not install)
npx serve out       # Serve the production build (`npm run start` fails: next start doesn't support output: 'export')
```

No test suite exists. Verify changes via `npm run lint`, `typecheck`, `format:check` and `build` (CI runs all four). To smoke-test a build, serve `out/` (`npx serve out -l <port>`) and drive it in a browser: `n` starts a game, `↑` adds a row.
For before/after visual checks, seed `Math.random`/`crypto.randomUUID` and fake the clock, then diff computed styles as well as pixels. Bubble anti-aliasing and the progress bar differ between runs of the same build.
Use real key presses (Playwright `keyboard.press`) when testing input: script-dispatched `KeyboardEvent`s never activate a focused button.
Bundle audit: `npx next analyze --output --snapshot <name>` then `npx next analyze export --snapshot <name> | gzip > <file>`. The client app chunk is triggered by `board.tsx`; zod is the largest app-owned dependency.

## Architecture

**Musse Buster** is a browser-based bubble-buster game (Next.js 16 App Router, React 19, static export via `output: 'export'`).

### State (`src/stores/game-store.ts`)

Single Zustand store (`useGameStore`) with `persist` middleware (localStorage key: `musse-buster-v0`), plus `devtools` in dev only via `withDevtools`, which is typed as identity so devtools-only API (`api.devtools`, `setState` action names) can't compile. zustand would otherwise enable devtools in production, since Next doesn't set `import.meta.env.MODE`. Persisted state is rehydrated without schema validation (no `merge`/`migrate`). Store actions orchestrate state mutations and delegate computation to `src/game-logic.ts` (pure, deterministic, no side effects). State machine: `'main-menu' | 'running' | 'paused' | 'game-over'`.

Key actions:

- `applyGravity()` — must be called manually after any removal (not automatic)
- `togglePause()` — preserves elapsed tick delta so resuming continues mid-interval

### Models (`src/models/`)

Zod schemas (imported from `zod/mini`) define both schema and TypeScript interface via `interface Foo extends z.infer<typeof Foo> {}`. Always use `.parse()` to construct objects (no field has a default; pass every field). Schemas that get `.parse()`d (`Bubble`, `Game`) are wrapped in `z.compile(...)` for a much faster parse, at about 9 KB gz of bundle cost; this needs zod ≥ 4.5, so keep the `^4.6.7` floor. `Color`/`BubbleType` are only checked inside `Bubble` and need no compile. Board is 10×14 (`BOARD_WIDTH` × `BOARD_HEIGHT`); y=0 is the bottom row — `BubbleCircle` flips to SVG space via `BOARD_HEIGHT - y - 1`. The `Bubble.animation` field drives CSS animations and must be set explicitly: `'spawning'` (new row), `'pushed-up'` (existing bubble shifted up), `'fall'` (gravity drop).

### UI (`src/app/`, `src/components/`)

- `board.tsx` — client component, `requestAnimationFrame` game loop, auto-pauses on tab hide, renders SVG grid
  - In `running`/`paused`: `p`/space=togglePause, `n`=reset, `↑`=debug add line
  - In `game-over`/`main-menu`: `n`/space=reset
  - The keydown listener is deliberately non-passive: it calls `preventDefault()` on `CLAIMED_KEYS` so space doesn't also activate a focused button, and it ignores `event.repeat`.
- Layout is desktop-only: the board is `w-[60vh]` and the score/button panels sit outside it (`right-full`/`left-full`), so on a phone the board is clipped and the panels are off-screen.
- `bottom-bar.tsx` — tick-progress bar driven by `useGameStore.subscribe()` + Web Animations API directly, bypassing React's render cycle entirely; no re-renders on tick updates
- `bubble-circle.tsx` — uses a `deferredY` / `useEffect` one-frame delay so the SVG `<circle>` transitions from the old position to the new one (enabling CSS `transition` for `'fall'` animation); `calcTransitionDuration` scales by number of rows fallen; uses `cva` (class-variance-authority) for color/type variants
- All component selectors combine multiple fields into a single `useGameStore(useShallow((state) => ({ ... })))` call — never multiple separate `useGameStore` calls per component

### Patterns

- **Exhaustive switches**: Use `switch` with `default: assertNever(value)` for all union type branching (game state, bubble type). `assertNever` (from `src/utils.ts`) accepts `never` and throws a `TypeError` — this enforces exhaustive handling at compile time and runtime.
- **Strict TypeScript**: Config extends `@tsconfig/strictest`; ESLint uses `typescript-eslint` `strictTypeChecked`. The code style is explicit null checks (`x == null`), but no lint rule enforces strict boolean expressions.
- **Zod imports**: Use `import * as z from 'zod/mini'` (wildcard import for correct tree-shaking).
- **Module-level constants**: Hoist stable event handlers and static values to module scope rather than using `useCallback(fn, [])` inside components. See `preventContextMenu`, `handleKeyDown`, `handleVisibilityChange` in `board.tsx`.
- **daisyUI**: `src/globals/styles.css` limits daisyUI via `include:` (internal names from `node_modules/daisyui/components/`, e.g. `button` not `btn`, plus the base styles `properties`, `rootcolor`, …). A new daisyUI component must be added there; `better-tailwindcss/no-unknown-classes` fails lint if it isn't.
- **Formatting**: Prettier with `prettier-plugin-tailwindcss`. 100-char line width, 2-space indent, `trailingComma: "es5"`, single quotes (CSS/YAML too).
