import daisyui, { type Config as DaisyuiConfig } from 'daisyui'
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      keyframes: {
        spawn: {
          '0%': { transform: 'scale(0)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        spawn: 'spawn 0.2s ease 1',
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: ['light'],
    logs: false,
  } satisfies DaisyuiConfig,
} satisfies Config
