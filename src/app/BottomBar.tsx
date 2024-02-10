import clsx from 'clsx'
import { memo, useEffect, useRef } from 'react'
import { lime, sky } from 'tailwindcss/colors'
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
  const addBubbleLine = useGameStore(useShallow((state) => state.addBubbleLine))
  const gameState = useGameStore(useShallow((state) => state.gameState))

  useEffect(() => {
    const div = ref.current
    if (div == null || gameState === 'game-over') {
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
      onClick={gameState === 'game-over' ? undefined : addBubbleLine}
      tabIndex={gameState === 'game-over' ? -1 : undefined}
      className={clsx(
        'box-border flex-none w-full h-[6vh] border-2 border-solid border-slate-700 relative cursor-pointer transition-all transform-gpu scale-100 active:scale-105',
        gameState === 'game-over' && 'pointer-events-none opacity-30'
      )}
    >
      <div
        ref={ref}
        className="bg-sky-500 absolute top-0 bottom-0 left-0 w-0 pointer-events-none transform-gpu"
      />
    </button>
  )
})
