import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { Bubble } from '../models/bubble'
import { BOARD_HEIGHT } from '../models/consts'
import { useGameStore } from '../stores/game-store'

interface Props {
  bubble: Bubble
}

export const BubbleCircle = memo(function Bubble({ bubble }: Props) {
  const handleClick = useCallback(() => {
    useGameStore.getState().clickBubble(bubble.key)
  }, [bubble.key])

  const x = bubble.x
  const y = useMemo(() => BOARD_HEIGHT - bubble.y - 1, [bubble.y])

  return (
    <>
      <rect
        x={x}
        y={y}
        width={1}
        height={1}
        className="fill-transparent cursor-pointer"
        onMouseDown={handleClick}
      />
      <rect
        x={x}
        y={y}
        width={1}
        height={1}
        rx={1}
        ry={1}
        strokeWidth={0.005}
        className={clsx(
          'shadow-xl transform-gpu stroke-slate-700 rounded-full pointer-events-none select-none',
          bubble.color === 'red' && 'fill-rose-500',
          bubble.color === 'blue' && 'fill-sky-500',
          bubble.color === 'green' && 'fill-lime-500',
          bubble.color === 'yellow' && 'fill-amber-500'
        )}
      />
    </>
  )
})
