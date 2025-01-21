/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: "#1a365d",
        secondary: "#2d3748",
        dark: {
          bg: "#1a1a1a",
          card: "#2d2d2d",
          text: "#e5e5e5",
        },
      },
      animation: {
        'gradient-flow': 'gradient-flow 15s ease infinite',
        'pulse-slow': 'pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shift': 'shift 15s ease infinite'
      },
      keyframes: {
        'gradient-flow': {
          '0%': {
            'background-position': '0% 50%',
            'background-size': '400% 400%',
            'opacity': '0.2'
          },
          '25%': {
            'background-position': '50% 25%',
            'background-size': '200% 200%',
            'opacity': '0.3'
          },
          '50%': {
            'background-position': '100% 50%',
            'background-size': '400% 400%',
            'opacity': '0.2'
          },
          '75%': {
            'background-position': '50% 75%',
            'background-size': '200% 200%',
            'opacity': '0.3'
          },
          '100%': {
            'background-position': '0% 50%',
            'background-size': '400% 400%',
            'opacity': '0.2'
          }
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.7' }
        },
        'shift': {
          '0%': { 
            backgroundPosition: '0% 50%',
            filter: 'hue-rotate(0deg)'
          },
          '50%': { 
            backgroundPosition: '100% 50%',
            filter: 'hue-rotate(180deg)'
          },
          '100%': { 
            backgroundPosition: '0% 50%',
            filter: 'hue-rotate(360deg)'
          }
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
} 