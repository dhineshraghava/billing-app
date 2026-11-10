/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        vyapar: {
          blue: '#1b4d89',
          darkBlue: '#12335c',
          lightBlue: '#ebf3fc',
          red: '#d32f2f',
          green: '#2e7d32',
          orange: '#ed6c02',
          gray: '#f5f7fa',
          border: '#e2e8f0',
        },
      },
    },
  },
  plugins: [],
}
