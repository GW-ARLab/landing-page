/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Navy palette remapped to light slate for light theme
        navy: {
          950: '#F8FAFC',
          900: '#F1F5F9',
          800: '#E2E8F0',
          700: '#FFFFFF',
          600: '#F8FAFC',
          500: '#CBD5E1',
        },
        electric: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        spark: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        lab: {
          green:  '#22C55E',
          amber:  '#F59E0B',
          violet: '#818CF8',
          red:    '#EF4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232563EB' fill-opacity='0.04'%3E%3Cpath d='M0 0h40v1H0V0zm0 39h40v1H0v-1zm0-20h40v1H0v-1zM0 0v40h1V0H0zm39 0v40h1V0h-1zm-20 0v40h1V0h-1z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        'dot-pattern': "url(\"data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='%232563EB' fill-opacity='0.05'/%3E%3C/svg%3E\")",
        'hero-gradient': 'linear-gradient(135deg, #080C18 0%, #0F1623 50%, #080C18 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(96,165,250,0.03) 100%)',
        'electric-gradient': 'linear-gradient(90deg, #2563EB, #1D4ED8)',
        'spark-gradient': 'linear-gradient(90deg, #D97706, #F59E0B)',
        'fire-gradient': 'linear-gradient(135deg, #2563EB 0%, #60A5FA 100%)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 16px rgba(37,99,235,0.30)' },
          '50%': { boxShadow: '0 0 36px rgba(37,99,235,0.55), 0 0 60px rgba(96,165,250,0.15)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
