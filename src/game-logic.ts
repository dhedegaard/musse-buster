import { Bubble } from './models/bubble'
import { BOARD_HEIGHT } from './models/consts'

export const INITIAL_TICK_RATE = 5200

export function isGameOver(bubbles: readonly Bubble[]): boolean {
  return bubbles.some((b) => b.y + 1 >= BOARD_HEIGHT)
}

export function calcTickRate(score: number): number {
  return Math.max(1500, INITIAL_TICK_RATE - Math.floor(score * 3))
}

export function findFloodFillGroup(bubbles: readonly Bubble[], key: string): Set<string> {
  const clickedBubble = bubbles.find((b) => b.key === key)
  if (clickedBubble == null || clickedBubble.type !== 'normal') {
    return new Set()
  }
  const { color } = clickedBubble
  const queue: Bubble[] = [clickedBubble]
  const seenKeys = new Set<string>()
  while (queue.length > 0) {
    const bubble = queue.pop()
    if (bubble == null || seenKeys.has(bubble.key)) {
      continue
    }
    seenKeys.add(bubble.key)
    const neighbors = bubbles.filter(
      (neighbor) =>
        ((Math.abs(neighbor.x - bubble.x) === 1 && neighbor.y === bubble.y) ||
          (Math.abs(neighbor.y - bubble.y) === 1 && neighbor.x === bubble.x)) &&
        neighbor.color === color &&
        neighbor.type === 'normal'
    )
    queue.push(...neighbors)
  }
  return seenKeys.size >= 3 ? seenKeys : new Set()
}

export function applyBombClick(bubbles: readonly Bubble[], bomb: Bubble): readonly Bubble[] {
  return bubbles.filter(
    (bubble) =>
      bubble.key !== bomb.key && !(bubble.color === bomb.color && bubble.type === 'normal')
  )
}

export function applyGravity(bubbles: readonly Bubble[]): readonly Bubble[] {
  let sortedBubbles = bubbles.toSorted((a, b) => a.y - b.y)
  let changed = true
  while (changed) {
    changed = false
    sortedBubbles = sortedBubbles.map((bubble) => {
      if (
        bubble.y > 0 &&
        !sortedBubbles.some((other) => other.x === bubble.x && other.y === bubble.y - 1)
      ) {
        changed = true
        return Bubble.parse({
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
  return [...sortedBubbles]
}
