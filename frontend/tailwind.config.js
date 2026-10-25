/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        figmaGreen: {
          DEFAULT: '#00A843',
          dark: '#008e39',
          light: '#E8F5E9',
          border: '#C8E6C9',
        },
        figmaPeach: {
          bg: '#FFF3E0',
          text: '#D97706',
          border: '#FFE0B2',
        },
        figmaGrey: {
          bg: '#F4F5F7',
          input: '#F0F2F5',
          border: '#E2E8F0',
          text: '#64748B',
        },
      },
    },
  },
  plugins: [],
};
