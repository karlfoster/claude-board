import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        board: {
          bg: 'var(--board-bg)',
          column: 'var(--column-bg)',
          card: 'var(--card-bg)',
          border: 'var(--border-color)',
          text: 'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          'text-tertiary': 'var(--text-tertiary)',
          accent: 'var(--accent)',
          'accent-hover': 'var(--accent-hover)',
          'accent-subtle': 'var(--accent-subtle)',
          header: 'var(--header-bg)',
          'header-border': 'var(--header-border)',
          input: 'var(--input-bg)',
          hover: 'var(--hover-bg)',
          badge: 'var(--badge-bg)',
          drop: 'var(--drop-highlight)',
          danger: 'var(--danger)',
          'danger-hover': 'var(--danger-hover)',
          success: 'var(--success)',
        },
        priority: {
          low: '#78716c',
          medium: '#0ea5e9',
          high: '#d97706',
          urgent: '#dc2626',
        },
      },
    },
  },
  plugins: [],
};

export default config;
