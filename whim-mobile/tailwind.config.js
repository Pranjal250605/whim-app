/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Whim editorial palette (ported from the design prototype)
        canvas: '#F9F8F6', // off-white app background
        ink: '#1C1C1C', // primary text / dark buttons
        muted: '#8E8E93', // secondary text
        accent: '#D97757', // brand terracotta (likes, highlights)
        hairline: 'rgba(28,28,28,0.08)',
      },
      fontFamily: {
        // loaded via expo-font in app/_layout.tsx (@expo-google-fonts)
        serif: ['PlayfairDisplay_600SemiBold', 'serif'],
        'serif-bold': ['PlayfairDisplay_700Bold', 'serif'],
        mono: ['IBMPlexMono_400Regular', 'monospace'],
        // body stays on the system font (San Francisco) — crisp at every weight
        sans: ['system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '28px',
      },
    },
  },
  plugins: [],
};
