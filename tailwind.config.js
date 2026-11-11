/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rf: {
          base: 'var(--rf-base)',
          raised: 'var(--rf-raised)',
          sunken: 'var(--rf-sunken)',
          deep: 'var(--rf-deep)',
          input: 'var(--rf-input)',
          hover: 'var(--rf-hover)',
          strong: 'var(--rf-strong)',
          border: 'var(--rf-border)',
          'border-strong': 'var(--rf-border-strong)',
          1: 'var(--rf-1)',
          2: 'var(--rf-2)',
          3: 'var(--rf-3)',
          4: 'var(--rf-4)',
          5: 'var(--rf-5)',
          6: 'var(--rf-6)',
        },
      },
    },
  },
  plugins: [],
};
