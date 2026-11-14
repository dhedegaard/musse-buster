import { describe, expect, it } from 'vitest'
import { keepBestGames } from '../game-logic'
import type { Bubble } from '../models/bubble'
import type { Game } from '../models/game'
import { mergePersistedState, type PersistedGameState } from './persisted-state'

const noop = () => undefined

interface TestStore extends PersistedGameState {
  reset: () => void
  togglePause: () => void
}

const initialState = (): TestStore => ({
  prevTickTime: -1,
  nextTickTime: -1,
  tickRate: 5200,
  bubbles: [],
  pausedTickDelta: undefined,
  gameState: 'main-menu',
  currentGame: { key: 'initial', score: 0, startedAt: '2026-11-14T10:00:00.000Z' } satisfies Game,
  oldGames: [],
  totalGames: 0,
  reset: noop,
  togglePause: noop,
})

const game = (score: number, key = `game-${score.toString()}`) =>
  ({ key, score, startedAt: '2025-01-01T00:00:00.000Z' }) satisfies Game

const bubble = (x: number, y: number, overrides: Partial<Bubble> = {}) =>
  ({
    key: `bubble-${x.toString()}-${y.toString()}`,
    type: 'normal',
    x,
    y,
    color: 'red',
    animation: 'pushed-up',
    ...overrides,
  }) satisfies Bubble

// What reaches `merge`: the save after a JSON round trip, as zustand stores it.
const fromStorage = (save: object): unknown => JSON.parse(JSON.stringify(save))

const merge = (save: object) => mergePersistedState(fromStorage(save), initialState())

const droppedParts = (save: object) => merge(save).dropped.map(({ part }) => part)

// The previous behaviour: zustand's default shallow merge, plus the `totalGames` fallback, with the
// history trimmed as reset() would.
const previousMerge = (save: Partial<PersistedGameState>) => ({
  ...initialState(),
  ...save,
  oldGames: keepBestGames(save.oldGames ?? []),
  totalGames: Math.max(
    save.totalGames ?? 0,
    (save.oldGames ?? []).filter(({ score }) => score > 0).length
  ),
})

const runningGame = {
  prevTickTime: 1000,
  nextTickTime: 6200,
  tickRate: 5000,
  pausedTickDelta: 0,
  gameState: 'running',
  currentGame: game(42, 'current'),
  oldGames: [game(10), game(30)],
  totalGames: 7,
  bubbles: [bubble(0, 0), bubble(1, 0, { type: 'bomb', color: 'blue' })],
} satisfies PersistedGameState

describe('mergePersistedState', () => {
  it('returns the initial state untouched on a first visit', () => {
    const current = initialState()
    const { state, dropped } = mergePersistedState(undefined, current)
    expect(state).toBe(current)
    expect(dropped).toEqual([])
  })

  describe('valid saves load as before, with the history trimmed', () => {
    const saves = {
      'a running game': runningGame,
      'a paused game without pausedTickDelta (before Apr 2024)': {
        prevTickTime: 1000,
        nextTickTime: 6200,
        tickRate: 5200,
        gameState: 'paused',
        currentGame: game(5, 'current'),
        oldGames: [game(3), game(0)],
        bubbles: [bubble(2, 0, { animation: 'fall' })],
      },
      'game over with a full history and board': {
        prevTickTime: 1,
        nextTickTime: 2,
        tickRate: 1500,
        pausedTickDelta: 0,
        gameState: 'game-over',
        currentGame: game(99, 'current'),
        oldGames: Array.from({ length: 1000 }, (_, i) => game(i + 1)),
        totalGames: 1500,
        bubbles: Array.from({ length: 140 }, (_, i) => bubble(i % 10, Math.floor(i / 10))),
      },
      'the main menu with nothing played': {
        prevTickTime: -1,
        nextTickTime: -1,
        tickRate: 5200,
        gameState: 'main-menu',
        currentGame: game(0, 'current'),
        oldGames: [],
        totalGames: 0,
        bubbles: [],
      },
    } satisfies Record<string, Partial<PersistedGameState>>

    it.each(Object.entries(saves))('%s', (_, save) => {
      const { state, dropped } = merge(save)
      expect(state).toStrictEqual(previousMerge(save))
      expect(dropped).toEqual([])
    })
  })

  // Raw saves as each era's build wrote them, kept as plain JSON on purpose: a required field added
  // to `Game` or `Bubble` breaks these until older saves get it filled in, in mergePersistedState.
  describe('saves from every era load without dropping anything', () => {
    const eras = {
      'cb33737, Feb 2024: first persisted build, bubbles without type': {
        save: '{"bubbles":[{"key":"0f8fad5b-d9cb-469f-a165-70867728950e","x":0,"y":0,"color":"green","animation":"pushed-up"},{"key":"7c9e6679-7425-40de-944b-e07fc1f90ae7","x":1,"y":0,"color":"red","animation":"fall"}],"prevTickTime":1707570000000,"nextTickTime":1707570005200,"tickRate":5200,"gameState":"paused"}',
        bubbles: 2,
        oldGames: 0,
      },
      '38ecff3, Feb 2024: currentScore': {
        save: '{"bubbles":[{"key":"0f8fad5b-d9cb-469f-a165-70867728950e","x":3,"y":0,"color":"yellow","animation":"spawning"}],"prevTickTime":1707570000000,"nextTickTime":1707570005200,"tickRate":5200,"gameState":"running","currentScore":12}',
        bubbles: 1,
        oldGames: 0,
      },
      '1c59107, Feb 2024: currentGame and oldGames': {
        save: '{"bubbles":[{"key":"0f8fad5b-d9cb-469f-a165-70867728950e","x":0,"y":0,"color":"blue","animation":"pushed-up"}],"prevTickTime":1707570000000,"nextTickTime":1707570005200,"tickRate":5200,"gameState":"game-over","currentScore":0,"currentGame":{"key":"e4eaaaf2-d142-11e1-b3e4-080027620cdd","score":31,"startedAt":"2024-02-10T18:00:00.000Z"},"oldGames":[{"key":"16fd2706-8baf-433b-82eb-8c7fada847da","score":8,"startedAt":"2024-02-10T17:00:00.000Z"},{"key":"886313e1-3b8a-5372-9b90-0c9aee199e5d","score":0,"startedAt":"2024-02-10T17:30:00.000Z"}]}',
        bubbles: 1,
        oldGames: 1,
      },
      '6f3d6d1, Mar 2024: bombs': {
        save: '{"bubbles":[{"key":"0f8fad5b-d9cb-469f-a165-70867728950e","type":"bomb","x":4,"y":0,"color":"red","animation":"spawning"},{"key":"7c9e6679-7425-40de-944b-e07fc1f90ae7","type":"normal","x":4,"y":1,"color":"green","animation":"pushed-up"}],"prevTickTime":1710680000000,"nextTickTime":1710680004800,"tickRate":4800,"gameState":"paused","currentGame":{"key":"e4eaaaf2-d142-11e1-b3e4-080027620cdd","score":140,"startedAt":"2024-03-17T12:00:00.000Z"},"oldGames":[{"key":"16fd2706-8baf-433b-82eb-8c7fada847da","score":95,"startedAt":"2024-03-16T12:00:00.000Z"}]}',
        bubbles: 2,
        oldGames: 1,
      },
      'd776559, Apr 2024: pausedTickDelta': {
        save: '{"bubbles":[],"prevTickTime":1713700000000,"nextTickTime":1713700005200,"tickRate":5200,"gameState":"paused","pausedTickDelta":2100,"currentGame":{"key":"e4eaaaf2-d142-11e1-b3e4-080027620cdd","score":7,"startedAt":"2024-04-21T12:00:00.000Z"},"oldGames":[]}',
        bubbles: 0,
        oldGames: 0,
      },
      'e0487c6, Mar 2025: nanoid game keys': {
        save: '{"bubbles":[{"key":"V1StGXR8_Z5jdHi6B-myT","type":"normal","x":9,"y":13,"color":"yellow","animation":"pushed-up"}],"prevTickTime":1741690000000,"nextTickTime":1741690003000,"tickRate":3000,"gameState":"running","pausedTickDelta":0,"currentGame":{"key":"FyWoxbVb3xGDhs5fp2Ct7","score":512,"startedAt":"2025-03-11T12:00:00.000Z"},"oldGames":[{"key":"4f90d13a42Ac_xYz-9QwE","score":300,"startedAt":"2025-03-10T12:00:00.000Z"},{"key":"4f90d13a42Ac_xYz-9QwF","score":120,"startedAt":"2025-03-09T12:00:00.000Z"}]}',
        bubbles: 1,
        oldGames: 2,
      },
      'Nov 2026: totalGames': {
        save: '{"bubbles":[],"prevTickTime":1763100000000,"nextTickTime":1763100005200,"tickRate":5200,"gameState":"main-menu","pausedTickDelta":0,"currentGame":{"key":"FyWoxbVb3xGDhs5fp2Ct7","score":0,"startedAt":"2026-11-14T12:00:00.000Z"},"oldGames":[{"key":"4f90d13a42Ac_xYz-9QwE","score":300,"startedAt":"2026-11-13T12:00:00.000Z"}],"totalGames":12}',
        bubbles: 0,
        oldGames: 1,
      },
    } satisfies Record<string, { save: string; bubbles: number; oldGames: number }>

    it.each(Object.entries(eras))('%s', (_, era) => {
      const { state, dropped } = mergePersistedState(JSON.parse(era.save), initialState())
      expect(dropped).toEqual([])
      expect(state.bubbles).toHaveLength(era.bubbles)
      expect(state.oldGames).toHaveLength(era.oldGames)
      expect(state.bubbles.map(({ type }) => type)).not.toContain(undefined)
      expect(state).not.toHaveProperty('currentScore')
    })
  })

  describe('a partly corrupted save keeps its valid parts', () => {
    it('drops only the bad old games', () => {
      const { state } = merge({
        ...runningGame,
        oldGames: [game(10), { key: '', score: 5, startedAt: 'x' }, game(20)],
      })
      expect(state.oldGames).toEqual([game(20), game(10)])
      expect(state.gameState).toBe('running')
      expect(droppedParts({ ...runningGame, oldGames: [game(1), 'bad'] })).toEqual([
        '1 of 2 old games',
      ])
    })

    it.each([
      ['a bad bubble', { bubbles: [bubble(0, 0), { ...bubble(1, 0), color: 'purple' }] }],
      ['a bad tick rate', { tickRate: 'fast' }],
      ['an unknown game state', { gameState: 'won' }],
    ])('drops the game in progress for %s, keeping the history', (_, corruption) => {
      const { state, dropped } = merge({ ...runningGame, ...corruption })
      expect(dropped.map(({ part }) => part)).toEqual(['the game in progress'])
      expect(state.gameState).toBe('main-menu')
      expect(state.bubbles).toEqual([])
      expect(state.tickRate).toBe(5200)
      expect(state.currentGame).toEqual(game(42, 'current'))
      expect(state.oldGames).toHaveLength(2)
    })

    it('empties oldGames when it is not an array', () => {
      const { state } = merge({ ...runningGame, oldGames: 'nope' })
      expect(state.oldGames).toEqual([])
      expect(state.gameState).toBe('running')
    })

    it('replaces a bad current game, and drops the game in progress that plays on it', () => {
      const { state, dropped } = merge({ ...runningGame, currentGame: { score: -1 } })
      expect(dropped.map(({ part }) => part)).toEqual([
        'the current game',
        'the game in progress, as its current game is invalid',
      ])
      expect(state.currentGame.key).toBe('initial')
      expect(state.gameState).toBe('main-menu')
      expect(state.bubbles).toEqual([])
      expect(state.oldGames).toHaveLength(2)
    })

    it('replaces a bad current game on the main menu without dropping anything else', () => {
      const save = { ...runningGame, gameState: 'main-menu', currentGame: { score: -1 } }
      expect(droppedParts(save)).toEqual(['the current game'])
    })

    it('recomputes a bad game count from the old games', () => {
      expect(merge({ ...runningGame, totalGames: -3 }).state.totalGames).toBe(2)
    })
  })

  it('catches the count up after a rollback to a build that does not count', () => {
    const save = {
      ...runningGame,
      oldGames: Array.from({ length: 80 }, (_, i) => game(i + 1)),
      totalGames: 50,
    }
    expect(merge(save).state.totalGames).toBe(80)
  })

  it('trims an uncapped history as reset() would, counting games before the cap', () => {
    const save = {
      ...runningGame,
      totalGames: 0,
      oldGames: [
        game(0, 'zero-a'),
        ...Array.from({ length: 1200 }, (_, i) => game(i + 1)),
        game(0),
      ],
    }
    const { state } = merge(save)
    expect(state.oldGames).toHaveLength(1000)
    expect(state.oldGames[0]?.score).toBe(1200)
    expect(state.oldGames.at(-1)?.score).toBe(201)
    expect(state.totalGames).toBe(1200)
  })

  it('keeps fields a newer build added to old games', () => {
    const { state, dropped } = merge({
      ...runningGame,
      oldGames: [{ ...game(10), endedAt: '2026-12-01T00:00:00.000Z' }],
    })
    expect(dropped).toEqual([])
    expect(state.oldGames).toEqual([{ ...game(10), endedAt: '2026-12-01T00:00:00.000Z' }])
  })

  it('removes retired keys from old builds', () => {
    expect(merge({ ...runningGame, currentScore: 12 }).state).not.toHaveProperty('currentScore')
  })

  it('keeps unknown keys but never lets the save replace an action', () => {
    const { state, dropped } = merge({ ...runningGame, reset: 5, futureField: { a: 1 } })
    expect(dropped).toEqual([])
    expect(state.reset).toBe(noop)
    expect(state).toMatchObject({ futureField: { a: 1 } })
  })

  it.each([
    ['a string', 'garbage'],
    ['an array', [1, 2]],
    ['a number', 7],
  ])('starts fresh when the save is %s', (_, save) => {
    const current = initialState()
    const { state, dropped } = mergePersistedState(save, current)
    expect(state).toBe(current)
    expect(dropped.map(({ part }) => part)).toEqual(['the whole save'])
  })
})
