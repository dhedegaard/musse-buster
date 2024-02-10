import { create } from 'zustand'
import { Bubble, bubbleSchema } from '../models/bubble'
import { colorSchema } from '../models/color'
import { BOARD_WIDTH } from '../models/consts'

interface GameStore {
  prevTickTime: number
  nextTickTime: number
  tickRate: number

  bubbles: Bubble[]

  addBubbleLine: () => void
  clickBubble: (key: string) => void
  applyGravity: () => void
}

const INITIAL_TICK_RATE = 5_200

const now = Date.now()
export const useGameStore = create<GameStore>()((set, get) => ({
  prevTickTime: now,
  nextTickTime: now + INITIAL_TICK_RATE,
  tickRate: INITIAL_TICK_RATE,
  bubbles: [],

  addBubbleLine() {
    const newBubbles = [...new Array<unknown>(BOARD_WIDTH)].map<Bubble>((_, x) => {
      const colorIndex = Math.floor(Math.random() * colorSchema.options.length)
      const color = colorSchema.options[colorIndex]
      if (color == null) {
        throw new Error('Color is null, bug in the code!')
      }
      const newBubble: Bubble = {
        key: crypto.randomUUID(),
        x,
        y: 0,
        color,
        animation: 'spawning',
      }
      return bubbleSchema.parse(newBubble)
    })
    const now = Date.now()
    set((state) => ({
      prevTickTime: now,
      nextTickTime: now + state.tickRate,
      bubbles: [
        ...newBubbles,
        ...state.bubbles.map((oldBubble) => {
          const newBubble: Bubble = {
            key: oldBubble.key,
            x: oldBubble.x,
            y: oldBubble.y + 1,
            color: oldBubble.color,
            animation: 'pushed-up',
          }
          return bubbleSchema.parse(newBubble)
        }),
      ],
    }))
  },
  clickBubble(key) {
    let changed = false
    set((state) => {
      const clickedBubble = state.bubbles.find((bubble) => bubble.key === key)
      if (clickedBubble == null) {
        return state
      }
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
            b.color === color
        )
        queue.push(...neighbors)
      }
      if (seenKeys.size < 3) {
        return state
      }
      changed = true
      return {
        bubbles: state.bubbles.filter((b) => !seenKeys.has(b.key)),
      }
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
            const newBubble: Bubble = {
              key: bubble.key,
              x: bubble.x,
              y: bubble.y - 1,
              color: bubble.color,
              animation: 'fall',
            }
            return newBubble
          }
          return bubble
        })
      }
      return { bubbles: [...sortedBubbles] }
    })
  },
}))

useGameStore.getState().addBubbleLine()
useGameStore.getState().addBubbleLine()
useGameStore.getState().addBubbleLine()
useGameStore.getState().addBubbleLine()
