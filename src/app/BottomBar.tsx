import { memo, useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '../stores/game-store'

const keyframe: Keyframe[] = [{ width: '0%' }, { width: '100%' }]
export const BottomBar = memo(function BottomBar() {
  const ref = useRef<HTMLDivElement>(null)

  const prevTickTime = useGameStore(useShallow((state) => state.prevTickTime))
  const nextTickTime = useGameStore(useShallow((state) => state.nextTickTime))
  const addBubbleLine = useGameStore(useShallow((state) => state.addBubbleLine))

  useEffect(() => {
    const div = ref.current
    if (div == null) {
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
  }, [prevTickTime, nextTickTime])

  return (
    <button
      type="button"
      onClick={addBubbleLine}
      className="box-border flex-none w-full h-[6vh] border-2 border-solid border-slate-700 relative cursor-pointer transition-all transform-gpu scale-100 active:scale-105"
    >
      <div
        ref={ref}
        className="bg-sky-500 absolute top-0 bottom-0 left-0 w-0 pointer-events-none transform-gpu"
      />
    </button>
  )
})
