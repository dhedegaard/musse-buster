'use client'

import clsx from 'clsx'
import { type MouseEventHandler, memo, useCallback, useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { BubbleCircle } from '../components/bubble-circle'
import { BOARD_HEIGHT, BOARD_WIDTH } from '../models/consts'
import { useGameStore } from '../stores/game-store'
import { assertNever } from '../utils'
import { BottomBar } from './bottom-bar'
import { CurrentScore } from './current-score'
import { HighScore } from './high-score'
import { SideButtons } from './side-buttons'

const noop = () => {}
const preventContextMenu: MouseEventHandler<SVGElement> = (event) => {
  event.preventDefault()
}

export const Board = memo(function Board() {
  const { bubbles, nextTickTime, gameState } = useGameStore(
    useShallow((state) => ({
      bubbles: state.bubbles,
      nextTickTime: state.nextTickTime,
      gameState: state.gameState,
    }))
  )

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

  useEffect(() => {
    switch (gameState) {
      case 'running':
      case 'paused': {
        const abortController = new AbortController()
        globalThis.document.addEventListener(
          'keydown',
          (event) => {
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
          },
          {
            signal: abortController.signal,
            passive: true,
          }
        )
        return () => {
          abortController.abort()
        }
      }
      case 'game-over':
      case 'main-menu': {
        const abortController = new AbortController()
        globalThis.document.addEventListener(
          'keydown',
          (event) => {
            if (event.metaKey || event.ctrlKey) {
              return
            }
            if (event.key === 'n' || event.key === ' ') {
              useGameStore.getState().reset()
            }
          },
          {
            signal: abortController.signal,
            passive: true,
          }
        )
        return () => {
          abortController.abort()
        }
      }
      default: {
        assertNever(gameState)
      }
    }
  }, [gameState])

  useEffect(() => {
    switch (gameState) {
      case 'game-over':
      case 'main-menu':
      case 'paused': {
        return noop
      }
      case 'running': {
        const abortController = new AbortController()
        globalThis.document.addEventListener(
          'visibilitychange',
          () => {
            if (document.hidden) {
              useGameStore.getState().togglePause()
            }
          },
          {
            signal: abortController.signal,
            passive: true,
          }
        )
        return () => {
          abortController.abort()
        }
      }
      default: {
        assertNever(gameState)
      }
    }
  }, [gameState])

  const handleClickGameOverlay = useCallback<MouseEventHandler<HTMLElement>>(() => {
    switch (gameState) {
      case 'running':
      case 'game-over': {
        break
      }
      case 'paused': {
        useGameStore.getState().togglePause()
        break
      }
      case 'main-menu': {
        useGameStore.getState().reset()
        break
      }
      default: {
        assertNever(gameState)
      }
    }
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
          `aspect-[14/10] max-w-full flex-auto transition-all`,
          gameState === 'paused' ? 'grayscale' : 'grayscale-0'
        )}
      >
        <svg
          role="graphics-symbol"
          aria-label="Game board"
          viewBox={`0 0 ${BOARD_WIDTH.toString()} ${BOARD_HEIGHT.toString()}`}
          width="100%"
          className="max-h-screen max-w-full"
          onContextMenu={preventContextMenu}
        >
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
          className="absolute inset-0 flex cursor-pointer select-none flex-col items-center justify-center gap-4 bg-white/70"
          onClick={handleClickGameOverlay}
        >
          {(() => {
            switch (gameState) {
              case 'paused': {
                return (
                  <>
                    <div className="text-3xl font-bold">Paused!</div>
                    <div className="text-xl font-bold">
                      Click here, or press &apos;P&apos;, to continue
                    </div>
                  </>
                )
              }
              case 'game-over': {
                return (
                  <>
                    <div className="text-3xl font-bold">GAME OVER!</div>
                    <div className="text-xl font-bold">
                      Click on the new game button (or press &apos;N&apos;), to start a new game
                    </div>
                  </>
                )
              }
              case 'main-menu': {
                return (
                  <>
                    <div className="text-3xl font-bold">MUSSE BUSTER!</div>
                    <div className="text-xl font-bold">Click here to start a game</div>
                  </>
                )
              }
              default: {
                assertNever(gameState)
              }
            }
          })()}
        </button>
      )}

      <BottomBar />
    </main>
  )
})
