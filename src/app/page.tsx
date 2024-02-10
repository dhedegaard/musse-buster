import { Metadata } from 'next'
import '../globals/styles.css'
import { Board } from './Board'

export const metadata: Metadata = {
  title: 'Musse buster!',
  description: 'A bubble buster game.',
  keywords: ['musse', 'bubble', 'buster', 'game', 'dhedegaard'],
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
  icons: { icon: '/favicon.png', apple: '/favicon.png' },
}

export default function Page() {
  return <Board />
}
