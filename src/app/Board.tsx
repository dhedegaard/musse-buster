'use client'

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
  useEffect(() => {
    if (gameState === 'running' || gameState === 'paused') {
      const handle = (event: KeyboardEvent) => {
        if (event.key === 'p' || event.key === ' ') {
          togglePause()
        }
      }
      window.document.addEventListener('keydown', handle)
      return () => {
        window.document.removeEventListener('keydown', handle)
      }
    }
  })

  return (
    <main className="box-border mx-auto my-4 flex flex-col gap-4 items-stretch h-[calc(100vh-64px)] w-[60vh] relative">
      {gameState !== 'running' && (
        <button
          type="button"
          className="absolute top-0 left-0 right-0 bottom-0 bg-white bg-opacity-70 flex flex-col items-center justify-center gap-4 select-none cursor-pointer"
          onClick={gameState === 'paused' ? togglePause : reset}
        >
          {match(gameState)
            .returnType<ReactNode>()
            .with('paused', () => (
              <>
                <div className="font-bold text-3xl">Paused!</div>
                <div className="font-bold text-xl">Click here to continue</div>
              </>
            ))
            .with('game-over', () => (
              <>
                <div className="font-bold text-3xl">GAME OVER!</div>
                <div className="font-bold text-xl">Click here to start over</div>
              </>
            ))
            .exhaustive()}
        </button>
      )}

      <div className={`flex-auto aspect-[14/10]`}>
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

      <BottomBar />
    </main>
  )
})
