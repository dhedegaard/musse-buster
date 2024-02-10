'use client'

import { memo, useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { BubbleCircle } from '../components/BubbleCircle'
import { BOARD_HEIGHT, BOARD_WIDTH } from '../models/consts'
import { useGameStore } from '../stores/game-store'
import { BottomBar } from './BottomBar'

export const Board = memo(function Board() {
  const bubbles = useGameStore(useShallow((state) => state.bubbles))
  const addBubbleLine = useGameStore(useShallow((state) => state.addBubbleLine))
  const nextTickTime = useGameStore(useShallow((state) => state.nextTickTime))

  useEffect(() => {
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
  }, [addBubbleLine, nextTickTime])

  return (
    <main className="box-border mx-auto my-4 flex flex-col gap-4 items-stretch h-[calc(100vh-64px)] w-[60vh]">
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
