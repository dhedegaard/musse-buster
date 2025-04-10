import type {} from '@redux-devtools/extension'
import { nanoid } from 'nanoid'
import { match } from 'ts-pattern'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { type Bubble, bubbleSchema } from '../models/bubble'
import { colorSchema } from '../models/color'
import { BOARD_HEIGHT, BOARD_WIDTH } from '../models/consts'
import { type Game, gameSchema } from '../models/game'

interface GameStore {
  prevTickTime: number
  nextTickTime: number
  tickRate: number
  pausedTickDelta?: number | undefined
  gameState: 'main-menu' | 'running' | 'game-over' | 'paused'
  currentGame: Game
  oldGames: Game[]

  bubbles: Bubble[]

  addBubbleLine: () => void
  clickBubble: (key: string) => void
  applyGravity: () => void
  reset: () => void
  togglePause: () => void
}

const INITIAL_TICK_RATE = 5200

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
            const colorIndex = Math.floor(Math.random() * colorSchema.options.length)
            const color = colorSchema.options[colorIndex]
            if (color == null) {
              throw new Error('Color is null, bug in the code!')
            }
            return bubbleSchema.parse({
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
            if (state.bubbles.some((b) => b.y + 1 >= BOARD_HEIGHT)) {
              return {
                gameState: 'game-over',
              }
            }
            const nextTickRate = Math.max(
              1500,
              INITIAL_TICK_RATE - Math.floor(state.currentGame.score * 3)
            )
            return {
              prevTickTime: now,
              nextTickTime: now + state.tickRate,
              tickRate: nextTickRate,
              bubbles: [
                ...nextBubbles,
                ...state.bubbles.map((oldBubble) =>
                  bubbleSchema.parse({
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
          let changed = false
          set((state) => {
            const clickedBubble = state.bubbles.find((bubble) => bubble.key === key)
            if (clickedBubble == null) {
              return {}
            }

            return match(clickedBubble)
              .returnType<GameStore | Partial<GameStore>>()
              .with({ type: 'bomb' }, (clickedBubble) => {
                const nextBubbles = state.bubbles
                  // Remove the clicked bomb
                  .filter((b) => b.key !== clickedBubble.key)
                  // Remove all normal bubbles of the same color.
                  .filter((b) => !(b.color === clickedBubble.color && b.type === 'normal'))
                changed = true
                return {
                  bubbles: state.bubbles
                    // Remove the clicked bomb
                    .filter((b) => b.key !== clickedBubble.key)
                    // Remove all normal bubbles of the same color.
                    .filter((b) => !(b.color === clickedBubble.color && b.type === 'normal')),
                  currentGame: gameSchema.parse({
                    key: state.currentGame.key,
                    score: state.currentGame.score + (state.bubbles.length - nextBubbles.length),
                    startedAt: state.currentGame.startedAt,
                  } satisfies Game),
                }
              })
              .with({ type: 'normal' }, (clickedBubble) => {
                const queue: Bubble[] = [clickedBubble]
                const { color } = clickedBubble
                const seenKeys = new Set<string>()
                while (queue.length > 0) {
                  const bubble = queue.pop()
                  if (bubble == null || seenKeys.has(bubble.key)) {
                    continue
                  }
                  seenKeys.add(bubble.key)
                  const neighbors = state.bubbles.filter(
                    (b) =>
                      ((Math.abs(b.x - bubble.x) === 1 && b.y === bubble.y) ||
                        (Math.abs(b.y - bubble.y) === 1 && b.x === bubble.x)) &&
                      b.color === color &&
                      b.type === 'normal'
                  )
                  queue.push(...neighbors)
                }
                if (seenKeys.size < 3) {
                  return {}
                }
                changed = true
                return {
                  bubbles: state.bubbles.filter((b) => !seenKeys.has(b.key)),
                  currentGame: gameSchema.parse({
                    key: state.currentGame.key,
                    score: state.currentGame.score + seenKeys.size,
                    startedAt: state.currentGame.startedAt,
                  } satisfies Game),
                }
              })
              .exhaustive()
          })
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (changed) {
            get().applyGravity()
          }
        },
        applyGravity() {
          set(({ bubbles }) => {
            let sortedBubbles = bubbles.toSorted((a, b) => a.y - b.y)
            let changed = true
            while (changed) {
              changed = false
              sortedBubbles = sortedBubbles.map((bubble) => {
                if (
                  bubble.y > 0 &&
                  !sortedBubbles.some((b) => b.x === bubble.x && b.y === bubble.y - 1)
                ) {
                  changed = true
                  return bubbleSchema.parse({
                    key: bubble.key,
                    type: bubble.type,
                    x: bubble.x,
                    y: bubble.y - 1,
                    color: bubble.color,
                    animation: 'fall',
                  } satisfies Bubble)
                }
                return bubble
              })
            }
            return { bubbles: [...sortedBubbles] }
          })
        },
        reset() {
          const now = new Date()
          set((state) => ({
            prevTickTime: now.getTime(),
            nextTickTime: now.getTime() + INITIAL_TICK_RATE,
            tickRate: INITIAL_TICK_RATE,
            bubbles: [],
            gameState: 'running',
            currentGame: gameSchema.parse({
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
