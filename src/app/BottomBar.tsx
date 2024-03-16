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

  const prevTickTime = useGameStore(useShallow((state) => state.prevTickTime))
  const nextTickTime = useGameStore(useShallow((state) => state.nextTickTime))
  const gameState = useGameStore(useShallow((state) => state.gameState))

  useEffect(() => {
    const div = ref.current
    if (div == null || gameState !== 'running') {
      return
    }
    const duration = nextTickTime - prevTickTime
    const animateHandle = div.animate(keyframe, {
      duration,
      easing: 'linear',
    })
    const percent = (Date.now() - prevTickTime) / (nextTickTime - prevTickTime)
    animateHandle.currentTime = duration * percent
    return () => {
      animateHandle.cancel()
    }
  }, [prevTickTime, nextTickTime, gameState])

  return (
    <button
      type="button"
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
        'box-border flex-none w-full h-[6vh] border-2 border-solid border-slate-700 relative cursor-pointer transition-all transform-gpu scale-100 active:scale-105',
        gameState !== 'running' && 'pointer-events-none opacity-30'
      )}
    >
      <div
        ref={ref}
        className="bg-sky-500 absolute top-0 bottom-0 left-0 w-0 pointer-events-none transform-gpu"
      />
    </button>
  )
})
