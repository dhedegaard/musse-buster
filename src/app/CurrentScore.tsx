'use client'

import { memo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '../stores/game-store'

export const CurrentScore = memo(function CurrentScore() {
  const score = useGameStore(useShallow((state) => state.currentGame.score))

  return (
    <div className="absolute right-full top-0 m-4 p-4 flex flex-col items-center gap-2 border border-solid border-slate-700 rounded-xl">
      <div className="text-xl font-semibold whitespace-nowrap">Current score:</div>
      <div className="text-3xl font-bold">{score.toLocaleString()}</div>
    </div>
  )
})
