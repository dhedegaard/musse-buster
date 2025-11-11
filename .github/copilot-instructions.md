# Musse Buster – AI Coding Agent Instructions

## Project Overview

**Musse Buster** is a "Bubble Shooter" style game built with Next.js (v15), React 19, TypeScript, and Zustand for state management. The game uses SVG for rendering a grid-based board where bubbles fall from the top, and players click to match and eliminate adjacent bubbles of the same color.

## Architecture & Data Flow

### State Management (Zustand + Zustand Middleware)

- **Location**: `src/stores/game-store.ts`
- Single source of truth using `useGameStore` created with Zustand
- **Middleware stack**: `devtools` (Redux DevTools enabled) + `persist` (localStorage: key `'musse-buster-v0'`)
- **Game state machine**: `'main-menu' | 'running' | 'game-over' | 'paused'`
- Store tracks: bubbles array, current/old games, tick rate, timing for game loop

### Core Models (Zod Validation)

All models in `src/models/` use **Zod validators** with interfaces extending inferred types:

- **`bubble.ts`**: Grid-positioned bubbles with type (`'normal'` | `'bomb'`), color, animation state
- **`game.ts`**: Game score records with nanoid keys and ISO datetime
- **`color.ts`**: Enum of 4 colors (`red`, `yellow`, `blue`, `green`)
- **`consts.ts`**: Board dimensions (10x14 grid) as frozen constants
- Pattern: Use `Bubble.parse()` / `Game.parse()` to validate when creating/updating objects

### Game Logic (Store Actions)

1. **`addBubbleLine()`**: Spawns row of bubbles at y=0, pushes existing bubbles up. Checks game-over condition. Dynamically increases tick rate based on score (faster gameplay).
2. **`clickBubble(key)`**: Implements two match behaviors:
   - **Bomb** bubbles: Remove clicked bomb + all normal bubbles of same color (no minimum)
   - **Normal** bubbles: Flood-fill connected same-color adjacent bubbles (requires ≥3 to remove)
   - Calls `applyGravity()` if bubbles were removed
3. **`applyGravity()`**: Repeatedly sorts bubbles by y-position and drops them until all have ground contact
4. **`reset()`**: Initialize new game, push old game to history, start with 4 bubble lines
5. **`togglePause()`**: Track elapsed tick delta to resume from paused position

### UI Architecture

- **`src/app/board.tsx`** (Client Component): Main game viewport
  - Uses `requestAnimationFrame` for game loop tick checking
  - Key listeners: `p`/`space` (pause), `n` (new game), `↑` (debug: add line)
  - Auto-pauses when tab becomes hidden (visibility change)
  - Renders SVG grid with bubble circles
- **Helper Components**: `current-score.tsx`, `high-score.tsx`, `bottom-bar.tsx`, `side-buttons.tsx`, `bubble-circle.tsx`
  - Uses Zustand's `useShallow()` for selector optimization
  - Styling: Tailwind + DaisyUI

## Key Patterns & Conventions

### Validation-First Design

- Zod validators define both schema and TypeScript types via `z.infer<>`
- Always use `.parse()` when constructing bubbles/games; this coerces values (e.g., defaults `type: 'normal'`)
- Comment in code documents intentional coercion behavior (see `bubble.ts` type field)

### Pattern Matching with `ts-pattern`

- Extensively uses `.match()` for exhaustive handling of union types (game state, bubble types)
- Pattern: `match(value).returnType<Type>().with(case1, handler1)...exhaustive()`
- Prevents unhandled cases at compile time

### Strict TypeScript

- Config extends `@tsconfig/strictest` + Next.js config
- ESLint enforces `strict-boolean-expressions`, no implicit any, type-checked at project level
- Nullable checks strict; conditional expressions must be explicit boolean

### Formatting & Linting

- **Biome** (v2.3.5) for formatting: 100 char line width, 2-space indent, single quotes in JS, double in JSX
- **ESLint** with TypeScript plugin for type-aware rules
- Run combined check: `npm run lint` → concurrently runs `biome ci` and `next lint`
- No organize-imports in Biome config (imports must be manually ordered)

## Developer Workflows

### Setup & Running

```bash
npm ci              # Install dependencies (use ci, not install)
npm run dev         # Start dev server with Turbopack (Next 15 feature)
npm run lint        # Check formatting + ESLint
npm run build       # Production build
npm run start       # Serve production build
```

### Testing & Debugging

- **Redux DevTools**: Enabled via `devtools` middleware; inspect store actions/states in browser extension
- **localStorage**: Game state persists in `musse-buster-v0` key; clear to reset store
- **Game loop**: Triggered by RAF; tick timing calculated against `nextTickTime` in store

### Adding Features

1. Define Zod schema in appropriate `models/` file if adding data structures
2. Update `GameStore` interface in `game-store.ts`
3. Implement action method using `set()` / `get()` from Zustand hook
4. Use `match()` patterns for UI logic in components
5. Run `npm run lint` before commit

## Integration Points & Dependencies

- **Next.js 15 & React 19**: App router, client components via `'use client'` directive
- **Zustand & Middleware**: Store creation, Redux DevTools integration, persistence
- **Zod (v4-mini)**: Lightweight validation; used for all data models
- **ts-pattern**: Pattern matching for exhaustive type checking
- **Tailwind CSS + DaisyUI**: Utility classes for responsive layout
- **nanoid**: Unique bubble and game keys (no UUID needed for simple games)

## Important Conventions

1. **Always use `useShallow()`** in component selectors to prevent unnecessary re-renders
2. **Grid coordinates**: x (0–9), y (0–13); y=0 is top, y increases downward
3. **Animations**: Stored as enum in bubble model (`'spawning'` | `'pushed-up'` | `'fall'`)
4. **Score calculation**: Points = count of removed bubbles (not a formula)
5. **Difficulty curve**: Tick rate decreases by 3ms per point; minimum 1500ms to prevent impossible speeds

## Common Gotchas

- Zustand `set()` expects partial state; use spread `...oldArray` to preserve unmodified data
- Bubble position validation happens in Zod; x and y bounds checked against board dimensions
- Gravity algorithm modifies bubbles by parsing to reset animation state
- Game-over check happens during `addBubbleLine()`, not after removal; design keeps falling state independent
