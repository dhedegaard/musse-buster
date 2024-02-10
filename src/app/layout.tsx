import { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Musse buster!',
  description: 'A bubble buster game.',
  keywords: ['musse', 'bubble', 'buster', 'game', 'dhedegaard'],
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
  icons: { icon: '/favicon.png', apple: '/favicon.png' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body>{children}</body>
    </html>
  )
}
