# AGENTS.md

## Project inventory

This repository currently contains **one project**:

1. `musse-buster` (root)
   - Type: Next.js 16 + React 19 + TypeScript web app
   - Purpose: A browser-based bubble-buster game with scoring, pause/resume, and persisted high scores
   - Runtime: Node.js `>=22`, npm `>=11`

## Project description: musse-buster

`musse-buster` is a single-page game built with the Next.js App Router and rendered as an SVG board.
The user clicks connected same-color bubbles (or bombs) to clear pieces and gain points while new lines
are periodically pushed onto the board.

### Core gameplay behavior

- Board size is fixed to `10 x 14` (`src/models/consts.ts`).
- New rows spawn on a timer; timer speeds up as score increases (`src/stores/game-store.ts`).
- Normal bubble groups must be size `>= 3` to clear.
- Bomb bubbles remove themselves and all normal bubbles of the same color.
- Gravity is applied after removals so bubbles fall to fill gaps.
- Game ends when a new row would push bubbles beyond board height.
- Game state transitions include `main-menu`, `running`, `paused`, and `game-over`.

### Architecture and directories

- `src/app/`
  - UI shell and major game panels (`board`, score widgets, controls, bottom timer bar).
- `src/components/`
  - Reusable visual components, primarily bubble rendering (`bubble-circle.tsx`).
- `src/stores/`
  - Zustand game state and all game actions (`game-store.ts`).
  - Uses `persist` middleware (`musse-buster-v0`) and devtools middleware.
- `src/models/`
  - Domain models and validation schemas (`Bubble`, `Game`, `Color`) using `zod/v4-mini`.
- `src/globals/`
  - Global CSS and Tailwind entry directives.
- `public/`
  - Static assets (favicon/manifest and related app assets).

### Key dependencies

- Framework/UI: `next`, `react`, `react-dom`
- State: `zustand`
- Validation: `zod`
- Pattern matching: `ts-pattern`
- Styling: `tailwindcss`, `daisyui`, `class-variance-authority`, `clsx`
- Utilities: `nanoid`

### Build and run

```bash
npm ci
npm run dev
npm run build
npm run start
npm run lint
```

### Notes for agents

- The app is configured with `output: 'export'` in `next.config.ts` for static export output.
- Input controls are keyboard + pointer driven (`P` pause/resume, `N` new game, space aliases in UI states).
- Prioritize changes in `src/stores/game-store.ts` for game logic and in `src/app/board.tsx` for runtime loop/input behavior.
