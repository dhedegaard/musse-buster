'use client'

import clsx from 'clsx'
import { type MouseEventHandler, memo, useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { BubbleCircle } from '../components/bubble-circle'
import { BOARD_HEIGHT, BOARD_WIDTH } from '../models/consts'
import { useGameStore } from '../stores/game-store'
import { assertNever } from '../utils'
import { BottomBar } from './bottom-bar'
import { CurrentScore } from './current-score'
import { HighScore } from './high-score'
import { SideButtons } from './side-buttons'

const preventContextMenu: MouseEventHandler<SVGElement> = (event) => {
  event.preventDefault()
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.metaKey || event.ctrlKey) {
    return
  }
  const state = useGameStore.getState()
  switch (state.gameState) {
    case 'running':
    case 'paused': {
      if (event.key === 'p' || event.key === ' ') {
        state.togglePause()
      }
      if (event.key === 'n') {
        state.reset()
      }
      if (event.key === 'ArrowUp') {
        state.addBubbleLine()
      }
      break
    }
    case 'game-over':
    case 'main-menu': {
      if (event.key === 'n' || event.key === ' ') {
        state.reset()
      }
      break
    }
    default: {
      assertNever(state.gameState)
    }
  }
}

const handleVisibilityChange = () => {
  const state = useGameStore.getState()
  if (state.gameState === 'running' && document.hidden) {
    state.togglePause()
  }
}

interface OverlayContentProps {
  gameState: 'paused' | 'game-over' | 'main-menu'
}
function OverlayContent({ gameState }: OverlayContentProps) {
  switch (gameState) {
    case 'paused': {
      return (
        <>
          <div className="text-3xl font-bold">Paused!</div>
          <div className="text-xl font-bold">Click here, or press &apos;P&apos;, to continue</div>
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
}

const handleClickGameOverlay: MouseEventHandler<HTMLElement> = () => {
  const state = useGameStore.getState()
  switch (state.gameState) {
    case 'running':
    case 'game-over': {
      break
    }
    case 'paused': {
      state.togglePause()
      break
    }
    case 'main-menu': {
      state.reset()
      break
    }
    default: {
      assertNever(state.gameState)
    }
  }
}

export const Board = memo(function Board() {
  const { bubbles, gameState } = useGameStore(
    useShallow((state) => ({
      bubbles: state.bubbles,
      gameState: state.gameState,
    }))
  )

  useEffect(() => {
    if (gameState !== 'running') {
      return
    }

    const frameCallback = () => {
      if (Date.now() >= useGameStore.getState().nextTickTime) {
        useGameStore.getState().addBubbleLine()
      }
      rafHandle = requestAnimationFrame(frameCallback)
    }
    let rafHandle = requestAnimationFrame(frameCallback)
    return () => {
      cancelAnimationFrame(rafHandle)
    }
  }, [gameState])

  useEffect(() => {
    const abortController = new AbortController()
    globalThis.document.addEventListener('keydown', handleKeyDown, {
      signal: abortController.signal,
      passive: true,
    })
    return () => {
      abortController.abort()
    }
  }, [])

  useEffect(() => {
    const abortController = new AbortController()
    globalThis.document.addEventListener('visibilitychange', handleVisibilityChange, {
      signal: abortController.signal,
      passive: true,
    })
    return () => {
      abortController.abort()
    }
  }, [])

  return (
    <main className="relative mx-auto my-4 box-border flex h-[calc(100vh-64px)] w-[60vh] flex-col items-stretch gap-4">
      <div className="absolute top-0 right-full m-4 flex flex-col items-end gap-4">
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
          className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-4 bg-white/70 select-none"
          onClick={handleClickGameOverlay}
        >
          <OverlayContent gameState={gameState} />
        </button>
      )}

      <BottomBar />
    </main>
  )
})
