import { Metadata } from 'next'
import '../globals/styles.css'
import { BOARD_HEIGHT, BOARD_WIDTH } from '../models/consts'
import { Board } from './Board'

export const metadata: Metadata = {
  title: 'Musse buster!',
  description: 'A bubble buster game.',
  keywords: ['musse', 'bubble', 'buster', 'game', 'dhedegaard'],
  robots: { index: true, follow: true },
}

export default function Page() {
  return (
    <svg
      viewBox={`0 0 ${BOARD_HEIGHT} ${BOARD_WIDTH}`}
      className="w-[400px] h-[800px] mx-auto border border-solid border-black"
    >
      <Board />
    </svg>
  )
}
