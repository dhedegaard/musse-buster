import { z } from 'zod/v4-mini'

export const colorOptions = ['red', 'yellow', 'blue', 'green'] as const

export const Color = z.enum(colorOptions)

export type Color = z.infer<typeof Color>
