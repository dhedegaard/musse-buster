# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm ci              # Install dependencies (always use ci, not install)
npm run dev         # Dev server with Turbopack
npm run build       # Production build (static export)
npm run start       # Serve production build
npm run lint        # ESLint (Next.js + TypeScript type-aware rules)
```

No test suite exists. Verify changes via `npm run lint` and `npm run build`.

## Architecture

**Musse Buster** is a browser-based bubble-buster game (Next.js 16 App Router, React 19, static export via `output: 'export'`).

### State (`src/stores/game-store.ts`)
Single Zustand store (`useGameStore`) with `devtools` + `persist` middleware (localStorage key: `musse-buster-v0`). All game logic lives here as store actions. State machine: `'main-menu' | 'running' | 'paused' | 'game-over'`.

Key actions:
- `addBubbleLine()` — spawns a row at y=0, pushes existing bubbles up, checks game-over, adjusts tick rate
- `clickBubble(key)` — flood-fill removal for normal bubbles (≥3 required), or bomb removes itself + all same-color normal bubbles
- `applyGravity()` — iteratively drops bubbles into empty spaces below; must be called manually after any removal (not automatic)
- `reset()` — new game, archives old game to `oldGames`, spawns 4 initial lines
- `togglePause()` — preserves elapsed tick delta so resuming continues mid-interval

Difficulty: tick rate starts at 5200ms, decreases by 3ms per point scored, floor 1500ms.

### Models (`src/models/`)
Zod schemas (imported from `zod/mini`) define both schema and TypeScript interface via `interface Foo extends z.infer<typeof Foo> {}`. Always use `.parse()` to construct objects — Zod applies defaults (e.g., `type: 'normal'` is `z.prefault`). Board is 10×14 (`BOARD_WIDTH` × `BOARD_HEIGHT`); y=0 is the bottom row — `BubbleCircle` flips to SVG space via `BOARD_HEIGHT - y - 1`.

### UI (`src/app/`, `src/components/`)
- `board.tsx` — client component, `requestAnimationFrame` game loop, auto-pauses on tab hide, renders SVG grid
  - In `running`/`paused`: `p`/space=togglePause, `n`=reset, `↑`=debug add line
  - In `game-over`/`main-menu`: `n`/space=reset
- All component selectors use `useShallow()` from `zustand/react/shallow` for re-render optimization

### Patterns
- **`ts-pattern`**: Use `match(value).returnType<T>().with(...).exhaustive()` for all union type branching (game state, bubble type). This enforces exhaustive handling at compile time.
- **Strict TypeScript**: Config extends `@tsconfig/strictest`. Strict boolean expressions enforced — conditionals must be explicit booleans.
- **Zod imports**: Use `import * as z from 'zod/mini'` (wildcard import for correct tree-shaking).
- **Formatting**: Prettier with `prettier-plugin-tailwindcss`. 100-char line width, 2-space indent, `trailingComma: "es5"`, single quotes.
