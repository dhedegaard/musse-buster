import { Bubble } from './models/bubble'
import { BOARD_HEIGHT } from './models/consts'

export const INITIAL_TICK_RATE = 5200

export function calcGroupScore(n: number): number {
  return n + (n - 2) ** 2
}

const posKey = (x: number, y: number): string => `${x.toString()},${y.toString()}`

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
  const byPos = new Map(bubbles.map((b) => [posKey(b.x, b.y), b]))
  const stack: Bubble[] = [clickedBubble]
  const seenKeys = new Set<string>()
  while (stack.length > 0) {
    const bubble = stack.pop()
    if (bubble == null || seenKeys.has(bubble.key)) continue
    seenKeys.add(bubble.key)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const neighbor = byPos.get(posKey(bubble.x + dx, bubble.y + dy))
      if (
        neighbor != null &&
        neighbor.color === color &&
        neighbor.type === 'normal' &&
        !seenKeys.has(neighbor.key)
      ) {
        stack.push(neighbor)
      }
    }
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
    const occupied = new Set(sortedBubbles.map((b) => posKey(b.x, b.y)))
    sortedBubbles = sortedBubbles.map((bubble) => {
      if (bubble.y > 0 && !occupied.has(posKey(bubble.x, bubble.y - 1))) {
        changed = true
        return Bubble.parse({ ...bubble, y: bubble.y - 1, animation: 'fall' } satisfies Bubble)
      }
      return bubble
    })
  }
  return sortedBubbles
}
