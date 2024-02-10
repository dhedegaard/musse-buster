'use client'

import { memo, useEffect } from 'react'
import { BubbleCircle } from '../components/BubbleCircle'
import { useCircles } from '../stores/circles'
import { BOARD_HEIGHT, BOARD_WIDTH } from '../models/consts'

export const Board = memo(function Board() {
  const bubbles = useCircles((state) => state.bubbles)
  const addBubbleLine = useCircles((state) => state.addBubbleLine)

  useEffect(() => {
    // TODO: Replace with a RAF, and the interval should be dynamic with a "level".
    const intervalHandle = setInterval(() => addBubbleLine(), 5_200)
    return () => clearInterval(intervalHandle)
  }, [addBubbleLine])

  return (
    <>
      <rect
        x={0}
        y={1}
        width={BOARD_WIDTH}
        height={BOARD_HEIGHT}
        stroke="black"
        strokeWidth={0.2}
        fill="white"
      />
      {bubbles.map((bubble) => (
        <BubbleCircle key={bubble.key} bubble={bubble} />
      ))}
    </>
  )
})
