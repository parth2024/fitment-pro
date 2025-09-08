import { createTheme, MantineColorsTuple } from '@mantine/core'

// Modern color palette - Professional gradient-based theme
const primary: MantineColorsTuple = [
  '#f0f6ff',
  '#e1eefe', 
  '#c4ddfd',
  '#a2c9fc',
  '#7fb0fa',
  '#6ba3f7',
  '#5b95f5',
  '#4a81da',
  '#3f74c4',
  '#3366ad'
]

const secondary: MantineColorsTuple = [
  '#f4f3ff',
  '#e7e5ff',
  '#cfc9ff',
  '#b5a9ff',
  '#9f8eff',
  '#917dff',
  '#8b74ff',
  '#7a64e4',
  '#6d59cd',
  '#5f4bb6'
]

const accent: MantineColorsTuple = [
  '#fff4e6',
  '#ffe8cc',
  '#ffd09b',
  '#ffb569',
  '#ff9f40',
  '#ff9125',
  '#ff8a16',
  '#e47507',
  '#ca6700',
  '#af5700'
]

const success: MantineColorsTuple = [
  '#f0fff4',
  '#dcfce7',
  '#bbf7d0',
  '#86efac',
  '#4ade80',
  '#22c55e',
  '#16a34a',
  '#15803d',
  '#166534',
  '#14532d'
]

export const theme = createTheme({
  primaryColor: 'primary',
  primaryShade: { light: 6, dark: 8 },
  colors: {
    primary,
    secondary,
    accent,
    success,
  },
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: '600',
  },
  defaultRadius: 'lg',
  cursorType: 'pointer',
  respectReducedMotion: true,
  focusRing: 'always',
  defaultGradient: {
    from: 'primary.6',
    to: 'secondary.6',
    deg: 135,
  },
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  components: {
    Card: {
      defaultProps: {
        radius: 'lg',
        shadow: 'sm',
        withBorder: true,
      },
      styles: {
        root: {
          border: '1px solid var(--mantine-color-gray-2)',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 'var(--mantine-shadow-lg)',
          },
        },
      },
    },
    Button: {
      defaultProps: {
        radius: 'lg',
        size: 'md',
      },
      styles: {
        root: {
          fontWeight: 500,
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    Input: {
      defaultProps: {
        radius: 'lg',
        size: 'md',
      },
      styles: {
        input: {
          border: '1.5px solid var(--mantine-color-gray-3)',
          transition: 'all 0.2s ease',
          '&:focus': {
            borderColor: 'var(--mantine-color-primary-5)',
            boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
          },
        },
      },
    },
    Table: {
      styles: {
        th: {
          backgroundColor: 'var(--mantine-color-gray-0)',
          fontWeight: 600,
          fontSize: '0.875rem',
          color: 'var(--mantine-color-gray-7)',
          borderBottom: '2px solid var(--mantine-color-gray-3)',
        },
        td: {
          borderBottom: '1px solid var(--mantine-color-gray-2)',
          padding: '12px 16px',
        },
      },
    },
  },
})