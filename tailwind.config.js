/** @type {import('tailwindcss').Config} */
module.exports = {
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
  plugins: [require('daisyui')],
  /** @type {import('daisyui').Config} */
  daisyui: {
    themes: ['light'],
    logs: false,
  },
}
