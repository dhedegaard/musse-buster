import { describe, expect, it } from 'vitest'
import type { Bubble } from '../models/bubble'
import type { Game } from '../models/game'
import { mergePersistedState, type PersistedGameState } from './persisted-state'

const noop = () => undefined

const initialState = () => ({
  prevTickTime: -1,
  nextTickTime: -1,
  tickRate: 5200,
  bubbles: [],
  pausedTickDelta: undefined,
  gameState: 'main-menu' as const,
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

// The previous behaviour: zustand's default shallow merge, plus the `totalGames` fallback.
const previousMerge = (save: Partial<PersistedGameState>) => ({
  ...initialState(),
  ...save,
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

  describe('valid saves load exactly as before', () => {
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

  it('keeps a save from the first day of persistence, filling in the bubble type', () => {
    const { state, dropped } = merge({
      prevTickTime: 1,
      nextTickTime: 2,
      tickRate: 5200,
      gameState: 'paused',
      currentScore: 12,
      bubbles: [{ key: 'old', x: 0, y: 0, color: 'green', animation: 'pushed-up' }],
    })
    expect(dropped).toEqual([])
    expect(state.gameState).toBe('paused')
    expect(state.bubbles).toEqual([
      { key: 'old', type: 'normal', x: 0, y: 0, color: 'green', animation: 'pushed-up' },
    ])
    expect(state).toMatchObject({ currentScore: 12 })
    expect(state.currentGame.key).toBe('initial')
    expect(state.oldGames).toEqual([])
  })

  describe('a partly corrupted save keeps its valid parts', () => {
    it('drops only the bad old games', () => {
      const { state } = merge({
        ...runningGame,
        oldGames: [game(10), { key: '', score: 5, startedAt: 'x' }, game(20)],
      })
      expect(state.oldGames).toEqual([game(10), game(20)])
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

    it('replaces a bad current game', () => {
      const { state } = merge({ ...runningGame, currentGame: { score: -1 } })
      expect(state.currentGame.key).toBe('initial')
      expect(state.gameState).toBe('running')
      expect(state.oldGames).toHaveLength(2)
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
