import clsx from 'clsx'
import { CSSProperties, memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Bubble } from '../models/bubble'
import { BOARD_HEIGHT } from '../models/consts'
import { useGameStore } from '../stores/game-store'
import styles from './BubbleCircle.module.css'

interface Props {
  bubble: Bubble
}

export const BubbleCircle = memo(function Bubble({ bubble }: Props) {
  const clickBubble = useGameStore(useShallow((state) => state.clickBubble))
  const handleClick = useCallback(() => {
    clickBubble(bubble.key)
  }, [bubble.key, clickBubble])

  const x = useMemo(() => bubble.x, [bubble.x])
  const currentY = useMemo(() => BOARD_HEIGHT - bubble.y - 1, [bubble.y])
  const [deferredY, setDeferredY] = useState(currentY)

  useEffect(() => {
    setDeferredY(currentY)
  }, [currentY])

  const [lastFallDelta, setLastFallDelta] = useState(0)
  useEffect(() => {
    if (bubble.animation === 'fall' && deferredY !== currentY) {
      setLastFallDelta(Math.abs(deferredY - currentY))
    }
  }, [bubble.animation, currentY, deferredY])

  return (
    <>
      <rect
        x={bubble.x}
        y={currentY}
        width={1}
        height={1}
        className="opacity-0 cursor-pointer"
        onMouseDown={handleClick}
      />
      <circle
        cx={x + 0.5}
        cy={deferredY + 0.5}
        width={1}
        height={1}
        r={0.5}
        strokeWidth={0.005}
        style={useMemo<CSSProperties>(
          () => ({
            transitionDuration:
              bubble.animation !== 'fall' ? undefined : `${lastFallDelta * 150}ms`,
          }),
          [bubble.animation, lastFallDelta]
        )}
        className={clsx(
          styles['Circle'],
          bubble.animation === 'spawning' && 'animate-spawn',
          bubble.color === 'red' && 'fill-rose-500',
          bubble.color === 'blue' && 'fill-sky-500',
          bubble.color === 'green' && 'fill-lime-500',
          bubble.color === 'yellow' && 'fill-amber-500'
        )}
      />
    </>
  )
})
