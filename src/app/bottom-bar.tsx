import clsx from 'clsx'
import { memo, type MouseEventHandler, useCallback, useEffect, useRef } from 'react'
import colors from 'tailwindcss/colors'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '../stores/game-store'
import { assertNever } from '../utils'

const keyframe: Keyframe[] = [
  { width: '0%', backgroundColor: colors.lime[400] },
  { width: '100%', backgroundColor: colors.sky[500] },
]
export const BottomBar = memo(function BottomBar() {
  const ref = useRef<HTMLDivElement>(null)

  const { previousTickTime, nextTickTime, gameState, pausedTickDelta } = useGameStore(
    useShallow((state) => ({
      previousTickTime: state.prevTickTime,
      nextTickTime: state.nextTickTime,
      gameState: state.gameState,
      pausedTickDelta: state.pausedTickDelta,
    }))
  )

  useEffect(() => {
    const div = ref.current
    if (div == null || (gameState !== 'running' && gameState !== 'paused')) {
      return
    }
    const duration = nextTickTime - previousTickTime
    const animateHandle = div.animate(keyframe, { duration, easing: 'linear' })
    const percent = Math.min(
      1,
      Math.max(
        0,
        (() => {
          switch (gameState) {
            case 'running': {
              return (Date.now() - previousTickTime) / (nextTickTime - previousTickTime)
            }
            case 'paused': {
              return (pausedTickDelta ?? 0) / duration
            }
            default: {
              assertNever(gameState)
            }
          }
        })()
      )
    )
    animateHandle.currentTime = duration * percent
    if (gameState === 'paused') {
      animateHandle.pause()
    }
    return () => {
      animateHandle.cancel()
    }
  }, [previousTickTime, nextTickTime, gameState, pausedTickDelta])

  const handleClick = useCallback<MouseEventHandler<HTMLElement>>(
    (event) => {
      event.preventDefault()
      event.stopPropagation()
      switch (gameState) {
        case 'running': {
          useGameStore.getState().addBubbleLine()
          break
        }
        case 'main-menu':
        case 'game-over': {
          useGameStore.getState().reset()
          break
        }
        case 'paused': {
          useGameStore.getState().togglePause()
          break
        }
        default: {
          assertNever(gameState)
        }
      }
    },
    [gameState]
  )

  return (
    <button
      type="button"
      aria-label="add bubble line"
      onClick={handleClick}
      onContextMenu={handleClick}
      tabIndex={gameState === 'running' ? undefined : -1}
      className={clsx(
        'relative box-border h-[6vh] w-full flex-none scale-100 transform-gpu cursor-pointer border-2 border-solid border-slate-700 transition-all active:scale-105',
        gameState !== 'running' && 'pointer-events-none opacity-30'
      )}
    >
      <div
        ref={ref}
        className="pointer-events-none absolute inset-y-0 left-0 w-0 transform-gpu bg-sky-500"
      />
    </button>
  )
})
