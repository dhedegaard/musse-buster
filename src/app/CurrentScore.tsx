'use client'

import { memo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '../stores/game-store'

export const CurrentScore = memo(function CurrentScore() {
  const score = useGameStore(useShallow((state) => state.currentGame.score))

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-solid border-slate-700 p-4">
      <div className="whitespace-nowrap text-xl font-semibold">Current score:</div>
      <div className="text-3xl font-bold">{score.toLocaleString()}</div>
    </div>
  )
})
