import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { Bubble } from '../models/bubble'
import { BOARD_HEIGHT } from '../models/consts'
import { useCircles } from '../stores/circles'

interface Props {
  bubble: Bubble
}

export const BubbleCircle = memo(function Bubble({ bubble }: Props) {
  const handleClick = useCallback(() => {
    useCircles.getState().clickBubble(bubble.key)
  }, [])

  return (
    <rect
      onMouseDown={handleClick}
      x={bubble.x}
      y={BOARD_HEIGHT - bubble.y}
      width={1}
      height={1}
      rx={1}
      ry={1}
      strokeWidth={0.01}
      className={clsx(
        'cursor-pointer shadow-xl transform-gpu stroke-slate-700',
        bubble.color === 'red' && 'fill-red-500',
        bubble.color === 'blue' && 'fill-blue-500',
        bubble.color === 'green' && 'fill-green-500',
        bubble.color === 'yellow' && 'fill-yellow-500'
      )}
    />
  )
})
