import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        /* CSS-variable backed — theme-aware */
        bg:    'var(--color-surface-0)',
        panel: 'var(--color-surface-1)',
        ink:   'var(--color-text-primary)',
        muted: 'var(--color-text-muted)',
        line:  'var(--color-border)',

        accent: {
          DEFAULT: '#52b788',
          hover:   '#40916c',
        },
        brand: {
          DEFAULT: '#1a3c2e',
          green:   '#52b788',
          blue:    '#235c7a',
          amber:   '#9a6418',
          red:     '#9f3434',
        },
        trace: {
          forest: '#1a3c2e',
          mint: '#52b788',
          paper: '#f6f7f4',
          ink: '#14221a',
          muted: '#657567',
          line: '#dce5dd',
          amber: '#b7791f',
          danger: '#b42318',
          teal: '#0f766e',
          blue: '#1d4ed8',
          organic: '#15803d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        dropdown: 'var(--shadow-dropdown)',
      },
      height: {
        header: '56px',
        'trace-header': '48px',
      },
    },
  },
  plugins: [],
};

export default config;
