import { z } from 'zod'
import { colorSchema } from './color'
import { BOARD_HEIGHT, BOARD_WIDTH } from './consts'

const bubbleTypeSchema = z.enum(['normal', 'bomb'])
export type BubbleType = z.TypeOf<typeof bubbleTypeSchema>

export const bubbleSchema = z.object({
  key: z.string().min(1),
  // NOTE: Later, we may remove the optionality here, but for now we want to translate missing values.
  type: z
    .optional(bubbleTypeSchema)
    .transform((value) => value ?? 'normal')
    .pipe(bubbleTypeSchema),
  x: z
    .number()
    .int()
    .min(0)
    .max(BOARD_WIDTH - 1),
  y: z
    .number()
    .int()
    .min(0)
    .max(BOARD_HEIGHT - 1),
  color: colorSchema,
  animation: z.enum(['spawning', 'pushed-up', 'fall']),
})
export type Bubble = z.TypeOf<typeof bubbleSchema>
