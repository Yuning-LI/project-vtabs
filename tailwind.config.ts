import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3E2723',
        bg: '#FDFBF7',
        'wood-light': '#fbeee5',
        'wood-dark': '#8b6f5c'
      },
      fontFamily: {
        serif: ['Times New Roman', 'serif']
      }
    }
  },
  plugins: []
}

export default config
