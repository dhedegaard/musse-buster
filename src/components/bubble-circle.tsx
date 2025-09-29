import { cva, type VariantProps } from 'class-variance-authority'
import clsx from 'clsx'
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEventHandler,
} from 'react'
import { P, match } from 'ts-pattern'
import type { Bubble } from '../models/bubble'
import { BOARD_HEIGHT } from '../models/consts'
import { useGameStore } from '../stores/game-store'
import styles from './bubble-circle.module.css'

interface Props {
  bubble: Bubble
}

const circleVariants = cva(styles['Circle'], {
  variants: {
    color: {
      red: 'fill-rose-600',
      blue: 'fill-sky-700',
      green: 'fill-lime-500',
      yellow: 'fill-amber-400',
    },
    type: {
      normal: 'stroke-transparent',
      bomb: 'stroke-black',
    },
    animation: {
      spawning: 'animate-spawn',
      'pushed-up': null,
      fall: null,
    },
  },
  defaultVariants: {
    type: 'normal',
  },
} as const)
interface CircleVariants extends Required<VariantProps<typeof circleVariants>> {}

export const BubbleCircle = memo(function Bubble({ bubble }: Props) {
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

  const styleObject = useMemo<CSSProperties>(
    () => ({
      transitionDuration: match({ animation: bubble.animation, lastFallDelta })
        .returnType<CSSProperties['transitionDuration']>()
        .with({ animation: 'fall' }, () => `${(lastFallDelta * 150).toString()}ms`)
        .with({ animation: P.union('pushed-up', 'spawning') }, () => '0ms')
        .exhaustive(),
    }),
    [bubble.animation, lastFallDelta]
  )

  const handleMouseDown = useCallback<MouseEventHandler<SVGRectElement>>(
    (event) => {
      event.preventDefault()
      event.stopPropagation()
      useGameStore.getState().clickBubble(bubble.key)
    },
    [bubble.key]
  )

  return (
    <>
      {/** biome-ignore lint/a11y/useSemanticElements: A <rect> inside an <svg> element */}
      <rect
        x={bubble.x}
        y={currentY}
        width={1}
        height={1}
        className="cursor-pointer opacity-0"
        onMouseDown={handleMouseDown}
        onContextMenu={handleMouseDown}
        role="button"
        tabIndex={0}
        aria-label="Bubble"
      />

      <circle
        cx={bubble.x + 0.5}
        cy={deferredY + 0.5}
        width={1}
        height={1}
        r={0.5 - 0.03}
        strokeWidth={0.025}
        style={styleObject}
        className={circleVariants(
          useMemo(
            () =>
              ({
                color: bubble.color,
                type: bubble.type,
                animation: bubble.animation,
              }) satisfies CircleVariants,
            [bubble.animation, bubble.color, bubble.type]
          )
        )}
      />
      {bubble.type === 'bomb' && (
        <text
          x={bubble.x + 0.5}
          y={deferredY + 0.5}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="0.6"
          className={clsx(
            styles['Circle'],
            'pointer-events-none select-none',
            bubble.animation === 'spawning' && 'animate-spawn'
          )}
          style={styleObject}
        >
          💣
        </text>
      )}
    </>
  )
})
