/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Whim "Field Notes" palette — deliberately off the AI cream+terracotta default.
        canvas: '#F0EEE8', // warm putty paper (flatter, less "editorial cream")
        ink: '#17150F', // warm near-black — primary text / dark buttons
        muted: '#7C766A', // secondary text (warm grey)
        accent: '#2740E0', // electric cobalt — passport-ink blue
        'accent-soft': '#DFE2FB', // pale cobalt tint (chips, avatars)
        destructive: '#D23B2C', // delete / clear actions
        hairline: 'rgba(23,21,15,0.08)',
      },
      fontFamily: {
        // loaded via expo-font in app/_layout.tsx (@expo-google-fonts)
        // `serif` is the display role — now Bricolage Grotesque, not a serif.
        serif: ['BricolageGrotesque_700Bold', 'sans-serif'],
        'serif-bold': ['BricolageGrotesque_800ExtraBold', 'sans-serif'],
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
