import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

export const viewport: Viewport = {
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'contain',
}
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
      <body className="overflow-x-clip">{children}</body>
    </html>
  )
}
