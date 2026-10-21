/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Mindora brand navy (#1A365D at 800)
        navy: {
          50: '#eef2f7',
          100: '#d8e1ec',
          200: '#b3c4d9',
          300: '#8aa2c2',
          400: '#5e7da6',
          500: '#3d5f8c',
          600: '#2a4a76',
          700: '#213f69',
          800: '#1a365d', // brand navy
          900: '#10243f',
          950: '#0b1b30',
        },
        // Kept the name "teal" so existing classes work; values are now brand sage (#82A3A1 at 400)
        teal: {
          50: '#f1f6f5',
          100: '#e1ecea',
          200: '#c4d8d6',
          300: '#a5c0be',
          400: '#82a3a1', // brand sage
          500: '#678b88',
          600: '#4f7370',
          700: '#3d5b59',
          800: '#2f4745',
          900: '#233634',
        },
        ink: {
          50: '#f8f9fa', // brand light
          100: '#eef1f3',
          200: '#dde3e8',
          300: '#c3ccd5',
          400: '#98a3b0',
          500: '#6b7684',
          600: '#4a5b6c',
          700: '#3a4a5c',
          800: '#26364a',
          900: '#10243f',
        },
        brand: {
          navy: '#1a365d',
          sage: '#82a3a1',
          amber: '#e2a970',
          'amber-soft': '#fbeedf',
          'amber-text': '#8a5414',
          light: '#f8f9fa',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        soft: '0 2px 8px rgba(16, 36, 63, 0.06), 0 1px 2px rgba(16, 36, 63, 0.04)',
        card: '0 4px 20px rgba(16, 36, 63, 0.07)',
        lift: '0 12px 32px rgba(16, 36, 63, 0.12)',
      },
      backgroundImage: {
        'mindora-gradient': 'linear-gradient(135deg, #1a365d 0%, #10243f 100%)',
        'mindora-soft': 'linear-gradient(135deg, #f1f6f5 0%, #f8f9fa 100%)',
      },
    },
  },
  plugins: [],
}
