/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        admiral: {
          // Navy (fondo)
          night:    '#070D1C',
          midnight: '#0B1428',
          navy:     '#0F1B33',
          'navy-2': '#142447',
          'navy-3': '#1E3463',
          // Gold (acentos premium)
          gold:      '#E8C96A',
          'gold-2':  '#D4A535',
          'gold-3':  '#A77E1F',
          'gold-4':  '#5C4615',
          bronze:    '#36281A',
          // Text
          ivory:    '#F4ECD5',
          cream:    '#E8DDC4',
          parch:    '#C8BFA8',
          mist:     '#8C8473',
          // Estados
          success:  '#5ECB8A',
          warn:     '#E8A030',
          danger:   '#E74C5C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in':     'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'rise':        'rise 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'rise-slow':   'rise 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        'glow':        'glow 2.4s ease-in-out infinite',
        'shimmer':     'shimmer 2.5s linear infinite',
        'pulse-gold':  'pulseGold 2s ease-in-out infinite',
        'scale-in':    'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        rise:    { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        glow:    {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(232, 201, 106, 0)' },
          '50%':      { boxShadow: '0 0 18px 2px rgba(232, 201, 106, 0.22)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGold: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.55' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.94)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
      },
      backgroundImage: {
        'gold-shine':  'linear-gradient(135deg, #F5DC8E 0%, #D4A535 50%, #8C6311 100%)',
        'gold-soft':   'linear-gradient(135deg, rgba(232,201,106,0.18) 0%, rgba(140,99,17,0.08) 100%)',
        'navy-glow':   'radial-gradient(ellipse at 20% 0%, rgba(30,52,99,0.45) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(167,126,31,0.18) 0%, transparent 55%)',
        'hairline':    'linear-gradient(90deg, transparent, rgba(232,201,106,0.6), transparent)',
      },
      opacity: {
        5: '0.05',
        8: '0.08',
        10: '0.1',
        12: '0.12',
        15: '0.15',
        20: '0.2',
        25: '0.25',
        30: '0.3',
        35: '0.35',
        40: '0.4',
        45: '0.45',
        50: '0.5',
        65: '0.65',
      },
      boxShadow: {
        'gold':      '0 0 32px -8px rgba(232,201,106,0.35)',
        'gold-soft': '0 4px 24px -10px rgba(232,201,106,0.30)',
        'inner-deep': 'inset 0 1px 0 0 rgba(232,201,106,0.08), inset 0 -1px 0 0 rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
};
