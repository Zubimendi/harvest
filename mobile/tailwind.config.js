/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require('nativewind/preset')],
  // Required for NativeWind colorScheme.set / Profile appearance toggle
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: '#FBF6EF', dark: '#1E1913' },
        surface: { DEFAULT: '#FFFFFF', dark: '#2A241C', alt: '#F3ECE1', 'alt-dark': '#352E24' },
        border: { DEFAULT: '#E8DFD3', dark: '#413A2F' },
        text: {
          primary: { DEFAULT: '#2B231D', dark: '#F5EEE3' },
          secondary: { DEFAULT: '#6B5F55', dark: '#B6A996' }
        },
        brand: { DEFAULT: '#C1502E', strong: '#9E3D22', dark: '#E2764F' },
        accent: {
          sage: { DEFAULT: '#6B8F71', dark: '#8CAE8F' },
          amber: { DEFAULT: '#D68C2A', dark: '#E6A64B' },
          error: { DEFAULT: '#B3462C', dark: '#D06249' },
          info: '#7A93A3',
        }
      },
      fontFamily: {
        display: ['Fraunces_600SemiBold', 'Fraunces_500Medium', 'serif'],
        body: ['Inter_400Regular', 'Inter_500Medium', 'Inter_600SemiBold', 'sans-serif'],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
        '12': '48px',
        '16': '64px',
      },
      borderRadius: {
        card: '20px',
        btn: '14px',
        input: '12px',
        pill: '999px',
      }
    },
  },
  plugins: [],
}
