'use client'

import { ArrowPathIcon, PauseIcon, PlayIcon } from '@heroicons/react/16/solid'
import clsx from 'clsx'
import { ReactNode, memo, useEffect } from 'react'
import { match } from 'ts-pattern'
import { useShallow } from 'zustand/react/shallow'
import { BubbleCircle } from '../components/BubbleCircle'
import { BOARD_HEIGHT, BOARD_WIDTH } from '../models/consts'
import { useGameStore } from '../stores/game-store'
import { BottomBar } from './BottomBar'

export const Board = memo(function Board() {
  const bubbles = useGameStore(useShallow((state) => state.bubbles))
  const addBubbleLine = useGameStore(useShallow((state) => state.addBubbleLine))
  const nextTickTime = useGameStore(useShallow((state) => state.nextTickTime))
  const gameState = useGameStore(useShallow((state) => state.gameState))
  const reset = useGameStore(useShallow((state) => state.reset))

  useEffect(() => {
    if (gameState !== 'running') {
      return
    }

    const frameCallback = () => {
      const now = Date.now()
      if (now >= nextTickTime) {
        addBubbleLine()
      }
      rafHandle = requestAnimationFrame(frameCallback)
    }
    let rafHandle = requestAnimationFrame(frameCallback)
    return () => {
      cancelAnimationFrame(rafHandle)
    }
  }, [addBubbleLine, gameState, nextTickTime])

  const togglePause = useGameStore(useShallow((state) => state.togglePause))
  useEffect(
    () =>
      match(gameState)
        .returnType<undefined | (() => void)>()
        .with('running', 'paused', () => {
          const handle = (event: KeyboardEvent) => {
            if (event.key === 'p' || event.key === ' ') {
              togglePause()
            }
            if (event.key === 'r') {
              reset()
            }
          }
          window.document.addEventListener('keydown', handle)
          return () => {
            window.document.removeEventListener('keydown', handle)
          }
        })
        .with('game-over', 'main-menu', () => {
          const handle = (event: KeyboardEvent) => {
            if (event.key === 'r' || event.key === ' ') {
              reset()
            }
          }
          window.document.addEventListener('keydown', handle)
          return () => {
            window.document.removeEventListener('keydown', handle)
          }
        })
        .exhaustive(),
    [gameState, reset, togglePause]
  )

  useEffect(
    () =>
      match(gameState)
        .returnType<undefined | (() => void)>()
        .with('game-over', 'main-menu', 'paused', () => undefined)
        .with('running', () => {
          const handle = () => {
            if (document.hidden) {
              togglePause()
            }
          }
          window.document.addEventListener('visibilitychange', handle)
          return () => {
            window.document.removeEventListener('visibilitychange', handle)
          }
        })
        .exhaustive(),
    [gameState, togglePause]
  )

  return (
    <main className="box-border mx-auto my-4 flex flex-col gap-4 items-stretch h-[calc(100vh-64px)] w-[60vh] relative">
      <div className="absolute left-full top-0 m-4 flex flex-col gap-2 items-start w-full">
        <button
          type="button"
          onClick={togglePause}
          disabled={gameState === 'game-over'}
          className="btn btn-primary btn-sm text-white whitespace-nowrap flex items-center gap-1"
        >
          {gameState === 'paused' ? (
            <>
              <PlayIcon width={16} /> <div>Resume (P)</div>
            </>
          ) : (
            <>
              <PauseIcon width={16} /> <div>Pause (P)</div>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={reset}
          className="btn btn-primary btn-sm text-white whitespace-nowrap flex items-center gap-1"
        >
          <ArrowPathIcon width={16} />
          <div>Reset (R)</div>
        </button>
      </div>

      <div
        className={clsx(
          `flex-auto transition-all aspect-[14/10]`,
          gameState === 'paused' ? 'grayscale' : 'grayscale-0'
        )}
      >
        <svg viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`} width="100%">
          <rect
            x={0}
            y={0}
            width={BOARD_WIDTH}
            height={BOARD_HEIGHT}
            stroke="black"
            strokeWidth={0.1}
            fill="white"
          />
          {bubbles.map((bubble) => (
            <BubbleCircle key={bubble.key} bubble={bubble} />
          ))}
        </svg>
      </div>

      {gameState !== 'running' && (
        <button
          type="button"
          className="absolute top-0 left-0 right-0 bottom-0 bg-white bg-opacity-70 flex flex-col items-center justify-center gap-4 select-none cursor-pointer"
          onClick={match(gameState)
            .returnType<() => void>()
            .with('paused', () => togglePause)
            .with('game-over', 'main-menu', () => reset)
            .exhaustive()}
        >
          {match(gameState)
            .returnType<ReactNode>()
            .with('paused', () => (
              <>
                <div className="font-bold text-3xl">Paused!</div>
                <div className="font-bold text-xl">
                  Click here, or press &apos;P&apos;, to continue
                </div>
              </>
            ))
            .with('game-over', () => (
              <>
                <div className="font-bold text-3xl">GAME OVER!</div>
                <div className="font-bold text-xl">Click here to start over</div>
              </>
            ))
            .with('main-menu', () => (
              <>
                <div className="font-bold text-3xl">MUSSE BUSTER!</div>
                <div className="font-bold text-xl">Click here to start a game</div>
              </>
            ))
            .exhaustive()}
        </button>
      )}

      <BottomBar />
    </main>
  )
})
