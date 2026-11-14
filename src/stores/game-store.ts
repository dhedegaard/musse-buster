import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import {
  INITIAL_TICK_RATE,
  applyBombClick,
  applyGravity as applyGravityLogic,
  calcGroupScore,
  calcTickRate,
  findFloodFillGroup,
  isGameOver,
  keepBestGames,
} from '../game-logic'
import { Bubble } from '../models/bubble'
import { colorOptions } from '../models/color'
import { BOARD_WIDTH } from '../models/consts'
import { Game } from '../models/game'
import { assertNever } from '../utils'
import { mergePersistedState, type PersistedGameState } from './persisted-state'

interface GameStore extends PersistedGameState {
  addBubbleLine: () => void
  clickBubble: (key: string) => void
  applyGravity: () => void
  reset: () => void
  togglePause: () => void
}

const SAVE_KEY = 'musse-buster-v0' as const
const BACKUP_KEY = `${SAVE_KEY}-backup` as const

// The cleaned state replaces the save on the next write, so keep the raw one to recover from. Each
// drop overwrites it: the cleaned save no longer holds what was dropped, so the same problem can't.
function backUpSave(persistedState: unknown) {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify({ state: persistedState, version: 0 }))
  } catch (error: unknown) {
    // eslint-disable-next-line no-console -- e.g. a full quota: the game still loads without it
    console.error('Could not back up the save before dropping parts of it', error)
  }
}

const identity = <S>(initializer: S): S => initializer

// Identity in production so the devtools middleware is tree-shaken out of the bundle. Typed as
// identity in dev too, so devtools-only API (`api.devtools`, `setState` action names) can't be
// used and then crash in production.
const withDevtools =
  process.env.NODE_ENV === 'production' ? identity : (devtools as typeof identity)

export const useGameStore = create<GameStore>()(
  withDevtools(
    persist<GameStore>(
      (set, get) => ({
        prevTickTime: -1,
        nextTickTime: -1,
        tickRate: INITIAL_TICK_RATE,
        bubbles: [],
        pausedTickDelta: undefined,
        gameState: 'main-menu' as const,
        currentGame: {
          key: crypto.randomUUID(),
          score: 0,
          startedAt: new Date().toISOString(),
        } satisfies Game,
        oldGames: [],
        totalGames: 0,

        addBubbleLine() {
          const nextBubbles = Array.from<unknown>({ length: BOARD_WIDTH }).map<Bubble>((_, x) => {
            const colorIndex = Math.floor(Math.random() * colorOptions.length)
            const color = colorOptions[colorIndex]
            if (color == null) {
              throw new Error('Color is null, bug in the code!')
            }
            return Bubble.parse({
              key: crypto.randomUUID(),
              type: Math.random() <= 0.015 ? 'bomb' : 'normal',
              x,
              y: 0,
              color,
              animation: 'spawning',
            } satisfies Bubble)
          })
          const now = Date.now()
          set((state) => {
            if (isGameOver(state.bubbles)) {
              return {
                gameState: 'game-over',
              }
            }
            const nextTickRate = calcTickRate(state.currentGame.score)
            return {
              prevTickTime: now,
              nextTickTime: now + state.tickRate,
              tickRate: nextTickRate,
              bubbles: [
                ...nextBubbles,
                ...state.bubbles.map((oldBubble) =>
                  Bubble.parse({
                    key: oldBubble.key,
                    type: oldBubble.type,
                    x: oldBubble.x,
                    y: oldBubble.y + 1,
                    color: oldBubble.color,
                    animation: 'pushed-up',
                  } satisfies Bubble)
                ),
              ],
            }
          })
        },
        clickBubble(key) {
          const prevLength = get().bubbles.length
          set((state) => {
            const clickedBubble = state.bubbles.find((bubble) => bubble.key === key)
            if (clickedBubble == null) {
              return {}
            }

            switch (clickedBubble.type) {
              case 'bomb': {
                const nextBubbles = applyBombClick(state.bubbles, clickedBubble)
                return {
                  bubbles: nextBubbles,
                  currentGame: Game.parse({
                    ...state.currentGame,
                    score:
                      state.currentGame.score +
                      calcGroupScore(state.bubbles.length - nextBubbles.length),
                  } satisfies Game),
                }
              }
              case 'normal': {
                const group = findFloodFillGroup(state.bubbles, key)
                if (group.size === 0) {
                  return {}
                }
                return {
                  bubbles: state.bubbles.filter((bubble) => !group.has(bubble.key)),
                  currentGame: Game.parse({
                    ...state.currentGame,
                    score: state.currentGame.score + calcGroupScore(group.size),
                  } satisfies Game),
                }
              }
              default: {
                assertNever(clickedBubble.type)
              }
            }
          })
          if (get().bubbles.length !== prevLength) {
            get().applyGravity()
          }
        },
        applyGravity() {
          set(({ bubbles }) => ({ bubbles: applyGravityLogic(bubbles) }))
        },
        reset() {
          const now = new Date()
          set((state) => {
            // A 0-score game (never started, or abandoned before scoring) doesn't count as played:
            // it isn't kept in `oldGames` or added to `totalGames`.
            const played = state.currentGame.score > 0 ? [state.currentGame] : []
            return {
              prevTickTime: now.getTime(),
              nextTickTime: now.getTime() + INITIAL_TICK_RATE,
              tickRate: INITIAL_TICK_RATE,
              bubbles: [],
              gameState: 'running',
              currentGame: Game.parse({
                key: crypto.randomUUID(),
                score: 0,
                startedAt: now.toISOString(),
              } satisfies Game),
              oldGames: keepBestGames([...played, ...state.oldGames]),
              totalGames: state.totalGames + played.length,
            }
          })
          get().addBubbleLine()
          get().addBubbleLine()
          get().addBubbleLine()
          get().addBubbleLine()
        },
        togglePause() {
          set((state) => {
            switch (state.gameState) {
              case 'running': {
                const tickDelta = Date.now() - state.prevTickTime
                return {
                  gameState: 'paused' as const,
                  pausedTickDelta: tickDelta <= 0 || tickDelta > state.tickRate ? 0 : tickDelta,
                }
              }
              case 'paused': {
                const nextTickStart = Date.now() - (state.pausedTickDelta ?? 0)
                return {
                  gameState: 'running' as const,
                  prevTickTime: nextTickStart,
                  nextTickTime: nextTickStart + state.tickRate,
                  pausedTickDelta: 0,
                }
              }
              case 'main-menu':
              case 'game-over': {
                return {}
              }
              default: {
                assertNever(state.gameState)
              }
            }
          })
        },
      }),
      {
        name: SAVE_KEY,
        merge(persistedState, currentState) {
          const { state, dropped } = mergePersistedState(persistedState, currentState)
          if (dropped.length > 0) {
            // eslint-disable-next-line no-console -- otherwise a bad save is silently partly reset
            console.error(
              `Dropped invalid parts of the save: ${dropped.map(({ part }) => part).join(', ')}`,
              dropped.map(({ error }) => error)
            )
            backUpSave(persistedState)
          }
          return state
        },
      }
    )
  )
)
