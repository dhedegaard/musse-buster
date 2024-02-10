import { create } from 'zustand'
import { Bubble, bubbleSchema } from '../models/bubble'
import { colorSchema } from '../models/color'
import { BOARD_WIDTH } from '../models/consts'

interface GameStore {
  bubbles: Bubble[]

  addBubbleLine: () => void
  clickBubble: (key: string) => void
  applyGravity: () => void
}

export const useGameStore = create<GameStore>()((set, get) => ({
  bubbles: [],

  addBubbleLine() {
    const newBubbles = [...new Array(BOARD_WIDTH)].map<Bubble>((_, x) => {
      const colorIndex = Math.floor(Math.random() * colorSchema.options.length)
      const color = colorSchema.options[colorIndex]
      const newBubble: Bubble = {
        key: crypto.randomUUID(),
        x,
        y: 0,
        color,
      }
      return bubbleSchema.parse(newBubble)
    })
    set((state) => ({
      bubbles: [
        ...newBubbles,
        ...state.bubbles.map((oldBubble) => {
          const newBubble: Bubble = {
            key: oldBubble.key,
            x: oldBubble.x,
            y: oldBubble.y + 1,
            color: oldBubble.color,
          }
          return bubbleSchema.parse(newBubble)
        }),
      ],
    }))
  },
  clickBubble(key) {
    let changed = false
    set((state) => {
      const queue: Bubble[] = [state.bubbles.find((bubble) => bubble.key === key)]
      const color = queue[0].color
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
              ...bubble,
              y: bubble.y - 1,
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
