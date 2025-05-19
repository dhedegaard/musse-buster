import { z } from 'zod/v4-mini'

export const Game = z.object({
  key: z.string().check(z.minLength(1)),
  score: z.int().check(z.nonnegative()),
  startedAt: z.iso.datetime({ offset: true }),
})

export interface Game extends z.infer<typeof Game> {}
