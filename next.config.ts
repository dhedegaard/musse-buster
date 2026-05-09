import type { NextConfig } from 'next'

export default {
  reactStrictMode: true,
  output: 'export',
  typedRoutes: true,
  experimental: {
    optimizePackageImports: ['zod', 'zod/mini'],
  },
} satisfies NextConfig
