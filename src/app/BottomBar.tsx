import clsx from 'clsx'
import { memo } from 'react'

export const BottomBar = memo(function BottomBar() {
  return (
    <div
      className={clsx(
        'box-border flex-none w-full h-12 border-2 border-solid border-slate-800 relative',
        'before:bg-sky-500 before:absolute before:top-0 before:bottom:0 before:left-0 transition-all before:w-52'
      )}
    />
  )
})
