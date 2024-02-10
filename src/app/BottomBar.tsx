import clsx from 'clsx'
import { CSSProperties, memo, useEffect, useMemo, useState, useTransition } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '../stores/game-store'

export const BottomBar = memo(function BottomBar() {
  const prevTickTime = useGameStore(useShallow((state) => state.prevTickTime))
  const nextTickTime = useGameStore(useShallow((state) => state.nextTickTime))
  const addBubbleLine = useGameStore(useShallow((state) => state.addBubbleLine))

  const [, startTransition] = useTransition()
  const [percentage, setPercentage] = useState(0)
  useEffect(() => {
    const frameCallback = () => {
      const now = Date.now()
      const newRawPercentage = Math.max(
        0,
        Math.min(100, ((now - prevTickTime) / (nextTickTime - prevTickTime)) * 100)
      )
      const newPercentage = Math.round(newRawPercentage * 1) / 1
      startTransition(() => {
        setPercentage(newPercentage)
      })
      rafHandle = requestAnimationFrame(frameCallback)
    }
    let rafHandle: number = requestAnimationFrame(frameCallback)
    return () => {
      cancelAnimationFrame(rafHandle)
    }
  }, [nextTickTime, prevTickTime])
  const styleObj = useMemo<CSSProperties>(
    // @ts-expect-error - css variable
    () => ({ '--percentage': `${percentage}%` }),
    [percentage]
  )

  return (
    <div
      role="button"
      onClick={addBubbleLine}
      className={clsx(
        'box-border flex-none w-full h-[6vh] border-2 border-solid border-slate-700 hover:border-slate-950 relative cursor-pointer',
        'before:bg-sky-500 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-[var(--percentage)]'
      )}
      tabIndex={0}
      style={styleObj}
    />
  )
})
