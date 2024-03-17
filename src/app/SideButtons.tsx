'use client'

import { ArrowPathIcon, PauseIcon, PlayIcon } from '@heroicons/react/16/solid'
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

  if (gameState === 'main-menu' || gameState === 'game-over') {
    return null
  }

  return (
    <div className="absolute left-full top-0 m-4 flex flex-col gap-2 items-start w-full">
      <button
        type="button"
        onClick={handleClicktogglePause}
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
        onClick={handleClickReset}
        className="btn btn-success btn-sm text-white whitespace-nowrap flex items-center gap-1"
      >
        <ArrowPathIcon width={16} />
        <div>New game (N)</div>
      </button>
    </div>
  )
})
