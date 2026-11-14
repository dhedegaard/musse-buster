import * as z from 'zod/mini'
import { keepBestGames } from '../game-logic'
import { Bubble } from '../models/bubble'
import { Game } from '../models/game'

export const GameState = z.enum(['main-menu', 'running', 'game-over', 'paused'])
export type GameState = z.infer<typeof GameState>

export interface PersistedGameState {
  prevTickTime: number
  nextTickTime: number
  tickRate: number
  pausedTickDelta?: number | undefined
  gameState: GameState
  currentGame: Game
  oldGames: readonly Game[]
  // Scored games ever played. `oldGames` is capped, so this can't be derived from it.
  totalGames: number
  bubbles: readonly Bubble[]
}

// Checked as one unit: a board with some bubbles dropped, or a running game with bad tick times, is
// worse than none. Left uncompiled: it runs once per load, and compiling at startup costs more than
// it saves. The compiled Bubble inside keeps its own fast path.
const GameInProgress = z.object({
  gameState: GameState,
  bubbles: z.array(Bubble),
  prevTickTime: z.number(),
  nextTickTime: z.number(),
  tickRate: z.number(),
  pausedTickDelta: z.optional(z.number()),
})

const TotalGames = z.int().check(z.nonnegative())

export interface DroppedPart {
  part: string
  error: unknown
}

export interface MergedState<S> {
  state: S
  dropped: readonly DroppedPart[]
}

// Keys only old builds wrote, so a future field with the same name can't pick up stale data.
// `currentScore` was replaced by `currentGame` on the day persistence was added (Feb 2024).
const RETIRED_KEYS: ReadonlySet<string> = new Set(['currentScore'])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value != null && !Array.isArray(value)

// Bubbles saved before bombs existed (Mar 2024) have no `type`. The model filled in 'normal' until
// May 2026, so do the same here rather than drop the board.
const withLegacyBubbleType = (bubble: unknown): unknown =>
  isRecord(bubble) && !('type' in bubble) ? { ...bubble, type: 'normal' } : bubble

/**
 * Merges a save over the initial state, keeping every part that is valid. A field missing from the
 * save keeps its initial value, as zustand's default merge did, so older saves load as before; only
 * a field that is present but invalid is replaced. Keys this build doesn't know are kept, since a
 * newer build may have written them and could be rolled forward to again.
 */
export function mergePersistedState<S extends PersistedGameState>(
  persisted: unknown,
  current: S
): MergedState<S> {
  // A first visit has nothing saved.
  if (persisted == null) {
    return { state: current, dropped: [] } satisfies MergedState<S>
  }
  if (!isRecord(persisted)) {
    return {
      state: current,
      dropped: [{ part: 'the whole save', error: persisted } satisfies DroppedPart],
    } satisfies MergedState<S>
  }
  const field = (key: keyof PersistedGameState): unknown =>
    key in persisted ? persisted[key] : current[key]
  const dropped: DroppedPart[] = []

  const bubbles = field('bubbles')
  const inProgress = GameInProgress.safeParse(
    {
      gameState: field('gameState'),
      bubbles: Array.isArray(bubbles) ? bubbles.map(withLegacyBubbleType) : bubbles,
      prevTickTime: field('prevTickTime'),
      nextTickTime: field('nextTickTime'),
      tickRate: field('tickRate'),
      pausedTickDelta: field('pausedTickDelta'),
    },
    { reportInput: true }
  )
  if (!inProgress.success) {
    dropped.push({ part: 'the game in progress', error: inProgress.error } satisfies DroppedPart)
  }

  const savedCurrentGame = Game.safeParse(field('currentGame'), { reportInput: true })
  // The game in progress plays on its current game's score (it sets the tick rate), so a board can't
  // continue without it.
  const keepInProgress =
    inProgress.success && (savedCurrentGame.success || inProgress.data.gameState === 'main-menu')
  if (!savedCurrentGame.success) {
    dropped.push({ part: 'the current game', error: savedCurrentGame.error } satisfies DroppedPart)
    if (inProgress.success && !keepInProgress) {
      dropped.push({
        part: 'the game in progress, as its current game is invalid',
        error: savedCurrentGame.error,
      } satisfies DroppedPart)
    }
  }

  const savedOldGames = field('oldGames')
  let validOldGames: readonly Game[] = []
  if (Array.isArray(savedOldGames)) {
    const results = savedOldGames.map((game: unknown) => ({
      game,
      result: Game.safeParse(game, { reportInput: true }),
    }))
    // Fields a newer build added are kept: gameplay never rewrites an old game, so they survive a
    // rollback here and are still there when that build comes back.
    validOldGames = results.flatMap(({ game, result }) =>
      result.success ? [isRecord(game) ? { ...game, ...result.data } : result.data] : []
    )
    const firstFailure = results.find(({ result }) => !result.success)
    if (firstFailure != null) {
      dropped.push({
        part: `${(savedOldGames.length - validOldGames.length).toString()} of ${savedOldGames.length.toString()} old games`,
        error: firstFailure.result.error,
      } satisfies DroppedPart)
    }
  } else {
    dropped.push({ part: 'the old games', error: savedOldGames } satisfies DroppedPart)
  }

  const savedTotalGames = TotalGames.safeParse(field('totalGames'), { reportInput: true })
  if (!savedTotalGames.success) {
    dropped.push({ part: 'the game count', error: savedTotalGames.error } satisfies DroppedPart)
  }
  // Older saves have no count, but their `oldGames` was still uncapped, so its scored games are the
  // exact count. A rolled-back build keeps the count but never adds to it, while it keeps adding to
  // an uncapped `oldGames`, so the larger of the two catches up on those games.
  // Counted before the cap below, which older saves haven't had applied yet.
  const scoredGames = validOldGames.filter((game) => game.score > 0).length
  const totalGames = Math.max(savedTotalGames.success ? savedTotalGames.data : 0, scoredGames)

  const unknownKeys = Object.fromEntries(
    Object.entries(persisted).filter(([key]) => !(key in current) && !RETIRED_KEYS.has(key))
  )
  return {
    state: {
      ...current,
      ...unknownKeys,
      ...(keepInProgress ? inProgress.data : {}),
      currentGame: savedCurrentGame.success ? savedCurrentGame.data : current.currentGame,
      // Older saves are uncapped and may hold 0-score games; trim them as reset() would, so they
      // aren't rewritten in full on every tick until the next new game.
      oldGames: keepBestGames(validOldGames),
      totalGames,
    },
    dropped,
  } satisfies MergedState<S>
}
