import { nanoid } from 'nanoid'
import { match } from 'ts-pattern'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { Bubble } from '../models/bubble'
import { colorOptions } from '../models/color'
import { BOARD_WIDTH } from '../models/consts'
import { Game } from '../models/game'
import {
  INITIAL_TICK_RATE,
  applyBombClick,
  applyGravity as applyGravityLogic,
  calcTickRate,
  findFloodFillGroup,
  isGameOver,
} from '../game-logic'

interface GameStore {
  prevTickTime: number
  nextTickTime: number
  tickRate: number
  pausedTickDelta?: number | undefined
  gameState: 'main-menu' | 'running' | 'game-over' | 'paused'
  currentGame: Game
  oldGames: readonly Game[]

  bubbles: readonly Bubble[]

  addBubbleLine: () => void
  clickBubble: (key: string) => void
  applyGravity: () => void
  reset: () => void
  togglePause: () => void
}


export const useGameStore = create<GameStore>()(
  devtools(
    persist<GameStore>(
      (set, get) => ({
        prevTickTime: -1,
        nextTickTime: -1,
        tickRate: INITIAL_TICK_RATE,
        bubbles: [],
        pausedTickDelta: undefined,
        gameState: 'main-menu' as const,
        currentGame: {
          key: nanoid(),
          score: 0,
          startedAt: new Date().toISOString(),
        } satisfies Game,
        oldGames: [],

        addBubbleLine() {
          const nextBubbles = Array.from<unknown>({ length: BOARD_WIDTH }).map<Bubble>((_, x) => {
            const colorIndex = Math.floor(Math.random() * colorOptions.length)
            const color = colorOptions[colorIndex]
            if (color == null) {
              throw new Error('Color is null, bug in the code!')
            }
            return Bubble.parse({
              key: nanoid(),
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

            return match(clickedBubble)
              .returnType<GameStore | Partial<GameStore>>()
              .with({ type: 'bomb' }, (clickedBubble) => {
                const nextBubbles = applyBombClick(state.bubbles, clickedBubble)
                return {
                  bubbles: nextBubbles,
                  currentGame: Game.parse({
                    key: state.currentGame.key,
                    score: state.currentGame.score + (state.bubbles.length - nextBubbles.length),
                    startedAt: state.currentGame.startedAt,
                  } satisfies Game),
                }
              })
              .with({ type: 'normal' }, () => {
                const group = findFloodFillGroup(state.bubbles, key)
                if (group.size === 0) {
                  return {}
                }
                return {
                  bubbles: state.bubbles.filter((bubble) => !group.has(bubble.key)),
                  currentGame: Game.parse({
                    key: state.currentGame.key,
                    score: state.currentGame.score + group.size,
                    startedAt: state.currentGame.startedAt,
                  } satisfies Game),
                }
              })
              .exhaustive()
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
          set((state) => ({
            prevTickTime: now.getTime(),
            nextTickTime: now.getTime() + INITIAL_TICK_RATE,
            tickRate: INITIAL_TICK_RATE,
            bubbles: [],
            gameState: 'running',
            currentGame: Game.parse({
              key: nanoid(),
              score: 0,
              startedAt: now.toISOString(),
            } satisfies Game),
            oldGames: [state.currentGame, ...state.oldGames],
          }))
          get().addBubbleLine()
          get().addBubbleLine()
          get().addBubbleLine()
          get().addBubbleLine()
        },
        togglePause() {
          set((state) => {
            if (state.gameState === 'running') {
              const tickDelta = Date.now() - state.prevTickTime
              return {
                gameState: 'paused',
                pausedTickDelta: tickDelta <= 0 || tickDelta > state.tickRate ? 0 : tickDelta,
              }
            } else if (state.gameState === 'paused') {
              const nextTickStart = Date.now() - (state.pausedTickDelta ?? 0)
              return {
                gameState: 'running',
                prevTickTime: nextTickStart,
                nextTickTime: nextTickStart + state.tickRate,
                pausedTickDelta: 0,
              }
            } else {
              return {}
            }
          })
        },
      }),
      { name: 'musse-buster-v0' }
    )
  )
)
