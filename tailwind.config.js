/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        observatorium: {
          950: 'var(--color-space-950)',
          900: 'var(--color-space-900)',
          glass: 'var(--color-glass)',
        },
      },
    },
  },
  plugins: [],
};
