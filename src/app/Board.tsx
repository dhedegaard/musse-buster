'use client'

import clsx from 'clsx'
import { MouseEventHandler, ReactNode, memo, useCallback, useEffect } from 'react'
import { match } from 'ts-pattern'
import { useShallow } from 'zustand/react/shallow'
import { BubbleCircle } from '../components/BubbleCircle'
import { BOARD_HEIGHT, BOARD_WIDTH } from '../models/consts'
import { useGameStore } from '../stores/game-store'
import { BottomBar } from './BottomBar'
import { CurrentScore } from './CurrentScore'
import { HighScore } from './HighScore'
import { SideButtons } from './SideButtons'

export const Board = memo(function Board() {
  const bubbles = useGameStore(useShallow((state) => state.bubbles))
  const nextTickTime = useGameStore(useShallow((state) => state.nextTickTime))
  const gameState = useGameStore(useShallow((state) => state.gameState))

  useEffect(() => {
    if (gameState !== 'running') {
      return
    }

    const frameCallback = () => {
      const now = Date.now()
      if (now >= nextTickTime) {
        useGameStore.getState().addBubbleLine()
      }
      rafHandle = requestAnimationFrame(frameCallback)
    }
    let rafHandle = requestAnimationFrame(frameCallback)
    return () => {
      cancelAnimationFrame(rafHandle)
    }
  }, [gameState, nextTickTime])

  useEffect(
    () =>
      match(gameState)
        .returnType<undefined | (() => void)>()
        .with('running', 'paused', () => {
          const handle = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey) {
              return
            }
            if (event.key === 'p' || event.key === ' ') {
              useGameStore.getState().togglePause()
            }
            if (event.key === 'n') {
              useGameStore.getState().reset()
            }
            if (event.key === 'ArrowUp') {
              useGameStore.getState().addBubbleLine()
            }
          }
          window.document.addEventListener('keydown', handle)
          return () => {
            window.document.removeEventListener('keydown', handle)
          }
        })
        .with('game-over', 'main-menu', () => {
          const handle = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey) {
              return
            }
            if (event.key === 'n' || event.key === ' ') {
              useGameStore.getState().reset()
            }
          }
          window.document.addEventListener('keydown', handle)
          return () => {
            window.document.removeEventListener('keydown', handle)
          }
        })
        .exhaustive(),
    [gameState]
  )

  useEffect(
    () =>
      match(gameState)
        .returnType<undefined | (() => void)>()
        .with('game-over', 'main-menu', 'paused', () => undefined)
        .with('running', () => {
          const handle = () => {
            if (document.hidden) {
              useGameStore.getState().togglePause()
            }
          }
          window.document.addEventListener('visibilitychange', handle)
          return () => {
            window.document.removeEventListener('visibilitychange', handle)
          }
        })
        .exhaustive(),
    [gameState]
  )

  const handleClickGameOverlay = useCallback<MouseEventHandler<HTMLElement>>(() => {
    match(gameState)
      .returnType<unknown>()
      .with('running', () => {})
      .with('paused', () => {
        useGameStore.getState().togglePause()
      })
      .with('game-over', 'main-menu', () => {
        useGameStore.getState().reset()
      })
      .exhaustive()
  }, [gameState])

  return (
    <main className="relative mx-auto my-4 box-border flex h-[calc(100vh-64px)] w-[60vh] flex-col items-stretch gap-4">
      <div className="absolute right-full top-0 m-4 flex flex-col items-end gap-4">
        <CurrentScore />
        <HighScore />
      </div>

      <SideButtons />

      <div
        className={clsx(
          `aspect-[14/10] flex-auto transition-all`,
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
          className="absolute bottom-0 left-0 right-0 top-0 flex cursor-pointer select-none flex-col items-center justify-center gap-4 bg-white bg-opacity-70"
          onClick={handleClickGameOverlay}
        >
          {match(gameState)
            .returnType<ReactNode>()
            .with('paused', () => (
              <>
                <div className="text-3xl font-bold">Paused!</div>
                <div className="text-xl font-bold">
                  Click here, or press &apos;P&apos;, to continue
                </div>
              </>
            ))
            .with('game-over', () => (
              <>
                <div className="text-3xl font-bold">GAME OVER!</div>
                <div className="text-xl font-bold">Click here to start over</div>
              </>
            ))
            .with('main-menu', () => (
              <>
                <div className="text-3xl font-bold">MUSSE BUSTER!</div>
                <div className="text-xl font-bold">Click here to start a game</div>
              </>
            ))
            .exhaustive()}
        </button>
      )}

      <BottomBar />
    </main>
  )
})
