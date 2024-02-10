import { z } from 'zod'

export const gameSchema = z.object({
  key: z.string().min(1),
  score: z.number().int().nonnegative(),
  startedAt: z.string().datetime({ offset: true }),
})

export interface Game extends z.TypeOf<typeof gameSchema> {}
