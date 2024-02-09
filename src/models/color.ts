import { z } from 'zod'

export const colorSchema = z.enum(['red', 'yellow', 'blue', 'green'])

export type Color = z.TypeOf<typeof colorSchema>
