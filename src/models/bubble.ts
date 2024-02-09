import { z } from 'zod'
import { colorSchema } from './color'
import { BOARD_HEIGHT, BOARD_WIDTH } from './consts'

export const bubbleSchema = z.object({
  key: z.string().min(1),
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
})
export interface Bubble extends z.TypeOf<typeof bubbleSchema> {}
