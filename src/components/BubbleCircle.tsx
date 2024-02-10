import clsx from 'clsx'
import { memo, useCallback, useMemo, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Bubble } from '../models/bubble'
import { BOARD_HEIGHT } from '../models/consts'
import { useGameStore } from '../stores/game-store'

interface Props {
  bubble: Bubble
}

export const BubbleCircle = memo(function Bubble({ bubble }: Props) {
  const clickBubble = useGameStore(useShallow((state) => state.clickBubble))
  const handleClick = useCallback(() => {
    clickBubble(bubble.key)
  }, [bubble.key, clickBubble])

  const x = bubble.x
  const y = useMemo(() => BOARD_HEIGHT - bubble.y - 1, [bubble.y])

  const renderedRef = useRef<SVGRectElement>(null)

  return (
    <>
      <rect
        x={x}
        y={y}
        width={1}
        height={1}
        className="opacity-0 cursor-pointer"
        onMouseDown={handleClick}
      />
      <rect
        ref={renderedRef}
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
