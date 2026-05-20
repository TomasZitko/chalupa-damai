/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dark:      '#322018',
        light:     '#EAE5DF',
        'off-white': '#F8F6F4',
        primary:   '#903C02',
        secondary: '#0A6365',
        lightgray: '#E0D9D1',
        stone200:  '#CEC3B6',
        teal500:   '#2CA09E',
        border:    'rgba(50,32,24,0.15)',
      },
      fontFamily: {
        sans:  ['"ABC Whyte"', 'system-ui', 'sans-serif'],
        serif: ['"Kaftan Serif"', 'Georgia', 'serif'],
      },
      borderRadius: {
        pill: '100em',
      },
      animation: {
        'fade-in': 'fadeIn .4s cubic-bezier(.3,1,.3,1) both',
        'slide-up': 'slideUp .5s cubic-bezier(.3,1,.3,1) both',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
