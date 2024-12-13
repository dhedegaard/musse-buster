'use client'

import { memo, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '../stores/game-store'

export const SideButtons = memo(function SideButtons() {
  const gameState = useGameStore(useShallow((state) => state.gameState))

  const handleClickReset = useCallback(() => {
    useGameStore.getState().reset()
  }, [])

  const handleClicktogglePause = useCallback(() => {
    useGameStore.getState().togglePause()
  }, [])

  if (gameState === 'main-menu') {
    return null
  }

  return (
    <div className="absolute left-full top-0 m-4 flex w-full flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleClicktogglePause}
        disabled={gameState === 'game-over'}
        className="btn btn-primary btn-sm flex items-center gap-1 text-white"
      >
        {gameState === 'paused' ? <div>Resume (P)</div> : <div>Pause (P)</div>}
      </button>
      <button
        type="button"
        onClick={handleClickReset}
        className="btn btn-success btn-sm bg-green-700 text-white"
      >
        New game (N)
      </button>
    </div>
  )
})
