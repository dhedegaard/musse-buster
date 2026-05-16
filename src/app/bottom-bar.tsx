import clsx from 'clsx'
import { memo, type MouseEventHandler, useEffect, useRef } from 'react'
import colors from 'tailwindcss/colors'
import { useGameStore } from '../stores/game-store'
import { assertNever } from '../utils'

const handleClick: MouseEventHandler<HTMLElement> = (event) => {
  event.preventDefault()
  event.stopPropagation()
  const { gameState } = useGameStore.getState()
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
}

const keyframe: Keyframe[] = [
  { width: '0%', backgroundColor: colors.lime[400] },
  { width: '100%', backgroundColor: colors.sky[500] },
]

export const BottomBar = memo(function BottomBar() {
  const ref = useRef<HTMLDivElement>(null)
  const gameState = useGameStore((state) => state.gameState)

  useEffect(() => {
    const animateBar = () => {
      const div = ref.current
      if (div == null) return null
      const { gameState, prevTickTime, nextTickTime, pausedTickDelta } = useGameStore.getState()
      if (gameState !== 'running' && gameState !== 'paused') {
        return null
      }
      const duration = nextTickTime - prevTickTime
      const handle = div.animate(keyframe, { duration, easing: 'linear' })
      const percent = Math.min(
        1,
        Math.max(
          0,
          (() => {
            switch (gameState) {
              case 'running': {
                return (Date.now() - prevTickTime) / duration
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
      handle.currentTime = duration * percent
      if (gameState === 'paused') {
        handle.pause()
      }
      return handle
    }

    let handle = animateBar()

    const unsubscribe = useGameStore.subscribe((state, prev) => {
      if (
        state.prevTickTime !== prev.prevTickTime ||
        state.nextTickTime !== prev.nextTickTime ||
        state.gameState !== prev.gameState ||
        state.pausedTickDelta !== prev.pausedTickDelta
      ) {
        handle?.cancel()
        handle = animateBar()
      }
    })

    return () => {
      unsubscribe()
      handle?.cancel()
    }
  }, [])

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
