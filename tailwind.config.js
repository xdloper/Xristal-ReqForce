/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rf: {
          base: 'rgb(var(--rf-base) / <alpha-value>)',
          raised: 'rgb(var(--rf-raised) / <alpha-value>)',
          sunken: 'rgb(var(--rf-sunken) / <alpha-value>)',
          deep: 'rgb(var(--rf-deep) / <alpha-value>)',
          input: 'rgb(var(--rf-input) / <alpha-value>)',
          hover: 'rgb(var(--rf-hover) / <alpha-value>)',
          strong: 'rgb(var(--rf-strong) / <alpha-value>)',
          border: 'rgb(var(--rf-border) / <alpha-value>)',
          'border-strong': 'rgb(var(--rf-border-strong) / <alpha-value>)',
          1: 'rgb(var(--rf-1) / <alpha-value>)',
          2: 'rgb(var(--rf-2) / <alpha-value>)',
          3: 'rgb(var(--rf-3) / <alpha-value>)',
          4: 'rgb(var(--rf-4) / <alpha-value>)',
          5: 'rgb(var(--rf-5) / <alpha-value>)',
          6: 'rgb(var(--rf-6) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};
