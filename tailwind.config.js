/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Override font stack — monospace everywhere
      fontFamily: {
        sans: ['"IBM Plex Mono"', '"Courier New"', 'Courier', 'monospace'],
        mono: ['"IBM Plex Mono"', '"Courier New"', 'Courier', 'monospace'],
      },
      // Bloomberg terminal color palette
      colors: {
        gray: {
          950: '#000000',   // pure black — main background
          900: '#0D0D0D',   // panel / card background
          800: '#1A1A1A',   // elevated surfaces, selected rows
          700: '#2A2A2A',   // borders, dividers
          600: '#555555',   // muted text, labels
          500: '#888888',   // secondary text
          400: '#AAAAAA',   // body text, data values
          300: '#CCCCCC',   // light labels
          200: '#E0E0E0',
          100: '#F0F0F0',
          50:  '#F8F8F8',
        },
        // Bloomberg orange replaces blue throughout
        blue: {
          300: '#FFA040',   // light orange highlight
          400: '#FF8C00',   // orange — hover states, links
          500: '#FF6600',   // Bloomberg orange — primary accent
          600: '#E55A00',   // darker orange — buttons
          700: '#CC4F00',
        },
        // Keep green brighter for terminal look
        emerald: {
          400: '#00D100',
          500: '#00BB00',
          600: '#009900',
        },
        // Keep red punchy
        red: {
          400: '#FF3333',
          500: '#EE2222',
          600: '#CC1111',
        },
      },
    },
  },
  plugins: [],
}
