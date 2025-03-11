import clsx from 'clsx'
import { memo, useCallback, useEffect, useRef } from 'react'
import { lime, sky } from 'tailwindcss/colors'
import { match } from 'ts-pattern'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '../stores/game-store'

const keyframe: Keyframe[] = [
  { width: '0%', backgroundColor: lime[400] },
  { width: '100%', backgroundColor: sky[500] },
]
export const BottomBar = memo(function BottomBar() {
  const ref = useRef<HTMLDivElement>(null)

  const previousTickTime = useGameStore(useShallow((state) => state.prevTickTime))
  const nextTickTime = useGameStore(useShallow((state) => state.nextTickTime))
  const gameState = useGameStore(useShallow((state) => state.gameState))
  const pausedTickDelta = useGameStore(useShallow((state) => state.pausedTickDelta))

  useEffect(() => {
    const div = ref.current
    if (div == null || (gameState !== 'running' && gameState !== 'paused')) {
      return
    }
    const duration = nextTickTime - previousTickTime
    const animateHandle = div.animate(keyframe, { duration, easing: 'linear' })
    const percent = Math.min(
      1,
      Math.max(
        0,
        match(gameState)
          .returnType<number>()
          .with(
            'running',
            () => (Date.now() - previousTickTime) / (nextTickTime - previousTickTime)
          )
          .with('paused', () => (pausedTickDelta ?? 0) / duration)
          .exhaustive()
      )
    )
    animateHandle.currentTime = duration * percent
    if (gameState === 'paused') {
      animateHandle.pause()
    }
    return () => {
      animateHandle.cancel()
    }
  }, [previousTickTime, nextTickTime, gameState, pausedTickDelta])

  return (
    <button
      type="button"
      aria-label="add bubble line"
      onClick={useCallback(() => {
        match(gameState)
          .returnType<undefined>()
          .with('running', () => {
            useGameStore.getState().addBubbleLine()
          })
          .with('main-menu', 'game-over', () => {
            useGameStore.getState().reset()
          })
          .with('paused', () => {
            useGameStore.getState().togglePause()
          })
          .exhaustive()
      }, [gameState])}
      tabIndex={gameState === 'running' ? undefined : -1}
      className={clsx(
        'relative box-border h-[6vh] w-full flex-none scale-100 transform-gpu cursor-pointer border-2 border-solid border-slate-700 transition-all active:scale-105',
        gameState !== 'running' && 'pointer-events-none opacity-30'
      )}
    >
      <div
        ref={ref}
        className="pointer-events-none absolute inset-y-0 left-0 w-0 transform-gpu bg-sky-500"
      />
    </button>
  )
})
