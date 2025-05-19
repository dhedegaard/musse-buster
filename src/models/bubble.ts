import { z } from 'zod/v4-mini'
import { Color } from './color'
import { BOARD_HEIGHT, BOARD_WIDTH } from './consts'

const BubbleType = z.enum(['normal', 'bomb'])
export type BubbleType = z.infer<typeof BubbleType>

export const Bubble = z.object({
  key: z.string().check(z.minLength(1)),
  // NOTE: Later, we may remove the optionality here, but for now we want to translate missing values.
  type: z.prefault(z.optional(BubbleType), 'normal'),
  x: z.int().check(z.nonnegative(), z.maximum(BOARD_WIDTH - 1)),
  y: z.int().check(z.nonnegative(), z.maximum(BOARD_HEIGHT - 1)),
  color: Color,
  animation: z.enum(['spawning', 'pushed-up', 'fall']),
})
export interface Bubble extends z.infer<typeof Bubble> {}
